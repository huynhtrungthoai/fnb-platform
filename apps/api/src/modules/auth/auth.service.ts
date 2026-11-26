import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppError } from '../../common/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { BranchesService } from '../branches/branches.service.js';
import { businessPermissions, resolveEffectiveAccess } from '../rbac/access.js';
import { CredentialHasher } from '../users/credential-hasher.js';
import { UserCredentialsService } from '../users/user-credentials.service.js';
import { UsersService } from '../users/users.service.js';
import { SessionService } from './session/session.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { SecretCheck } from '../users/user-credentials.service.js';
import type { UserRow } from '../users/users.repository.js';
import type {
  AuthTokens,
  ChangePassword,
  ChangePin,
  LoginInput,
  Me,
  MeBranch,
} from '@fnb/contract';

const invalidCredentials = (): AppError =>
  new AppError('INVALID_CREDENTIALS', 'Wrong username or PIN/password');

/**
 * Sign-in to Admin with username + PIN, or password for the super admin (CORE-12, D-29), token
 * refresh and logout (CORE-15). Every outcome of a login attempt reads the same to the client
 * until the secret is right, so the screen never reveals which accounts exist.
 */
@Injectable()
export class AuthService {
  /** Hash checked when the username does not exist, so both paths take the same time. */
  private decoyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersService,
    private readonly hasher: CredentialHasher,
    private readonly credentials: UserCredentialsService,
    private readonly sessions: SessionService,
    private readonly branches: BranchesService,
    private readonly audit: AuditService,
  ) {}

  async login(input: LoginInput, now: Date = new Date()): Promise<AuthTokens> {
    const user = await this.users.findForLogin(input.username);
    if (!user) {
      this.decoyHash ??= this.hasher.hash('decoy-secret');
      await this.hasher.verify(await this.decoyHash, input.secret);
      await this.recordFailure(null, input.username, 'unknown_username');
      throw invalidCredentials();
    }
    // The server picks the secret by account: the super admin's PIN never opens Admin (D-29).
    const kind = user.credentialType === 'password' ? 'password' : 'pin';
    let check: SecretCheck;
    try {
      check = await this.credentials.checkSecret(user, input.secret, kind, now);
    } catch (error) {
      await this.recordFailure(user, input.username, 'locked');
      throw error;
    }
    if (!check.isValid) {
      await this.recordFailure(user, input.username, 'wrong_secret');
      throw check.isLocked
        ? new AppError('ACCOUNT_LOCKED', 'Account locked after too many wrong attempts')
        : invalidCredentials();
    }
    if (!user.isActive) {
      await this.recordFailure(user, input.username, 'disabled');
      throw new AppError('ACCOUNT_DISABLED', 'Account is disabled');
    }
    await this.users.recordLogin(user.id, now);
    const tokens = await this.sessions.start(
      { userId: user.id, mustChangePin: this.mustChangePin(user) },
      now,
    );
    await this.audit.record({
      action: 'auth.login',
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      branchId: null,
      metadata: { credentialType: user.credentialType },
    });
    return tokens;
  }

  /** New tokens for a refresh token; the old one can never be used again. */
  async refresh(refreshToken: string, now: Date = new Date()): Promise<AuthTokens> {
    const row = await this.sessions.peek(refreshToken, now);
    const user = await this.users.findRow(row.userId);
    if (!user?.isActive) {
      await this.sessions.end(row.sessionId, row.userId, now);
      throw new AppError('UNAUTHENTICATED', 'Account is no longer active');
    }
    return this.sessions.rotate(
      row,
      {
        userId: user.id,
        mustChangePin: this.mustChangePin(user),
        ...(row.deviceId ? { deviceId: row.deviceId } : {}),
      },
      now,
    );
  }

  async logout(auth: AuthContext): Promise<void> {
    await this.sessions.end(auth.sessionId, auth.userId);
    this.audit.describe({ entityType: 'user', entityId: auth.userId, branchId: null });
  }

  /** Ends every session of the caller, on every device. */
  async logoutEverywhere(auth: AuthContext): Promise<void> {
    await this.sessions.endAllOfUser(auth.userId);
    this.audit.describe({
      entityType: 'user',
      entityId: auth.userId,
      branchId: null,
      metadata: { everywhere: true },
    });
  }

  /** The caller sets a new PIN; ends the caller's other sessions and returns fresh tokens. */
  async changePin(auth: AuthContext, input: ChangePin): Promise<AuthTokens> {
    const row = await this.credentials.changeOwnPin(auth.userId, input.currentPin, input.newPin);
    return this.sessions.start({
      userId: row.id,
      mustChangePin: false,
      ...(auth.deviceId ? { deviceId: auth.deviceId } : {}),
    });
  }

  /** The super admin sets a new password; ends the other sessions and returns fresh tokens. */
  async changePassword(auth: AuthContext, input: ChangePassword): Promise<AuthTokens> {
    const row = await this.credentials.changeOwnPassword(
      auth.userId,
      input.currentPassword,
      input.newPassword,
    );
    return this.sessions.start({ userId: row.id, mustChangePin: false });
  }

  /** The caller and what they may do at each branch (06 section 7.2). */
  async me(auth: AuthContext): Promise<Me> {
    const access = auth.access;
    const summaries = access.allBranches
      ? await this.branches.allSummaries()
      : await this.branches.summariesByIds(Object.keys(access.branches));
    const branches: MeBranch[] = [];
    for (const branch of summaries) {
      const effective = resolveEffectiveAccess(access, branch.id);
      if (effective) {
        branches.push({
          branch,
          role: { id: effective.roleId, code: effective.roleCode, name: effective.roleName },
          isAllBranches: effective.isAllBranches,
          permissions: effective.permissions,
          limits: effective.limits,
        });
      }
    }
    branches.sort((a, b) => a.branch.code.localeCompare(b.branch.code));
    const business = businessPermissions(access);
    const permissionsVersion = createHash('sha256')
      .update(JSON.stringify({ branches, business }))
      .digest('base64url')
      .slice(0, 16);
    return {
      user: await this.users.getSelf(auth.userId),
      hasAllBranches: access.allBranches !== null,
      branches,
      businessPermissions: business,
      permissionsVersion,
    };
  }

  private mustChangePin(user: UserRow): boolean {
    // The super admin signs in to Admin with a password; its PIN is only for POS (D-29).
    return user.credentialType === 'pin' && user.mustChangePin;
  }

  private async recordFailure(
    user: UserRow | null,
    username: string,
    reason: string,
  ): Promise<void> {
    await this.audit.record({
      action: 'auth.login_failed',
      actorUserId: user?.id ?? null,
      entityType: 'user',
      ...(user ? { entityId: user.id } : {}),
      branchId: null,
      metadata: { username, reason },
    });
  }
}
