import { Injectable } from '@nestjs/common';

import { MAX_FAILED_ATTEMPTS, SUPER_ADMIN_LOCK_MINUTES } from '@fnb/contract';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session/session.service.js';
import { CredentialHasher } from './credential-hasher.js';
import { UsersRepository } from './users.repository.js';
import { auditBranchOf, isLockedNow, toUser, UsersService } from './users.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { UserRow } from './users.repository.js';
import type { UserWithAssignments } from '@fnb/contract';

/** Which secret a check is about. */
export type SecretKind = 'pin' | 'password';

/** Result of checking a secret against an account. */
export type SecretCheck = { isValid: true } | { isValid: false; isLocked: boolean };

const accountLocked = (row: UserRow, now: Date): AppError =>
  new AppError('ACCOUNT_LOCKED', 'Account is locked', {
    params:
      row.lockedUntil && row.lockedUntil > now
        ? { lockedUntil: row.lockedUntil.toISOString() }
        : {},
  });

/**
 * PINs and passwords of staff accounts (CORE-13, CORE-14, D-29): the shared counter of wrong
 * attempts that locks an account after five, temporary PINs, self-service change, and the
 * manager's reset and unlock.
 */
@Injectable()
export class UserCredentialsService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly users: UsersService,
    private readonly hasher: CredentialHasher,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  /** Throws `ACCOUNT_LOCKED` while the account is locked. */
  assertNotLocked(row: UserRow, now: Date = new Date()): void {
    if (isLockedNow(row, now)) {
      throw accountLocked(row, now);
    }
  }

  /**
   * Checks a secret and keeps the shared counter (Admin, POS, on-the-spot approval): a wrong
   * one counts, the fifth in a row locks the account. The super admin's lock lifts after
   * 30 minutes; everyone else waits for a manager.
   */
  async checkSecret(
    row: UserRow,
    secret: string,
    kind: SecretKind,
    now: Date = new Date(),
  ): Promise<SecretCheck> {
    this.assertNotLocked(row, now);
    const storedHash = kind === 'password' ? row.passwordHash : row.pinHash;
    if (await this.hasher.verify(storedHash, secret)) {
      if (row.failedAttempts > 0 || row.lockedAt !== null) {
        await this.repository.update(row.id, {
          failedAttempts: 0,
          lockedAt: null,
          lockedUntil: null,
        });
      }
      return { isValid: true };
    }
    if (row.lockedAt !== null) {
      // An expired super admin lock: the count starts again.
      await this.repository.update(row.id, {
        failedAttempts: 0,
        lockedAt: null,
        lockedUntil: null,
      });
    }
    const attempts = await this.repository.incrementFailedAttempts(row.id);
    if (attempts < MAX_FAILED_ATTEMPTS) {
      return { isValid: false, isLocked: false };
    }
    const isSuperAdmin = row.credentialType === 'password';
    const lockedUntil = isSuperAdmin
      ? new Date(now.getTime() + SUPER_ADMIN_LOCK_MINUTES * 60_000)
      : null;
    await this.repository.update(row.id, { lockedAt: now, lockedUntil });
    await this.audit.record({
      action: 'auth.account_locked',
      actorUserId: row.id,
      entityType: 'user',
      entityId: row.id,
      branchId: null,
      metadata: { attempts, lockedUntil: lockedUntil?.toISOString() ?? null },
    });
    // TODO(M7-07): post the super admin lock to the Discord channel (D-33).
    return { isValid: false, isLocked: true };
  }

  /** The caller changes their own PIN; the old one must be right. Ends every other session. */
  async changeOwnPin(userId: string, currentPin: string, newPin: string): Promise<UserRow> {
    const row = await this.requireRow(userId);
    const check = await this.checkSecret(row, currentPin, 'pin');
    if (!check.isValid) {
      throw check.isLocked
        ? accountLocked(row, new Date())
        : new AppError('INVALID_CREDENTIALS', 'Current PIN is wrong');
    }
    const updated = await this.repository.update(userId, {
      pinHash: await this.hasher.hash(newPin),
      mustChangePin: false,
    });
    await this.sessions.endAllOfUser(userId);
    this.audit.describe({ entityType: 'user', entityId: userId, branchId: null });
    return updated ?? row;
  }

  /** The super admin changes their own password. Ends every other session. */
  async changeOwnPassword(userId: string, current: string, next: string): Promise<UserRow> {
    const row = await this.requireRow(userId);
    if (row.credentialType !== 'password') {
      throw new AppError('PERMISSION_DENIED', 'Only the super admin signs in with a password');
    }
    const check = await this.checkSecret(row, current, 'password');
    if (!check.isValid) {
      throw check.isLocked
        ? accountLocked(row, new Date())
        : new AppError('INVALID_CREDENTIALS', 'Current password is wrong');
    }
    const updated = await this.repository.update(userId, {
      passwordHash: await this.hasher.hash(next),
    });
    await this.sessions.endAllOfUser(userId);
    this.audit.describe({ entityType: 'user', entityId: userId, branchId: null });
    return updated ?? row;
  }

  /**
   * A manager sets a new temporary PIN for someone (CORE-14). Also unlocks the account and ends
   * every session. Nobody reads a PIN back, and the super admin account is out of reach.
   */
  async resetPin(caller: AuthContext, id: string, pin: string): Promise<UserWithAssignments> {
    const { row: target, branchId } = await this.requireResettable(caller, id);
    await this.repository.update(id, {
      pinHash: await this.hasher.hash(pin),
      mustChangePin: true,
      failedAttempts: 0,
      lockedAt: null,
      lockedUntil: null,
    });
    await this.sessions.endAllOfUser(id);
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: { isLocked: isLockedNow(target, new Date()) },
      after: { isLocked: false, mustChangePin: true },
      branchId,
    });
    return this.users.getById(caller, id);
  }

  /** A manager unlocks an account locked by wrong PINs; the PIN stays the same. */
  async unlock(caller: AuthContext, id: string): Promise<UserWithAssignments> {
    const { row: target, branchId } = await this.requireResettable(caller, id);
    await this.repository.update(id, { failedAttempts: 0, lockedAt: null, lockedUntil: null });
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: toUser(target),
      after: { isLocked: false },
      branchId,
    });
    return this.users.getById(caller, id);
  }

  private async requireRow(id: string): Promise<UserRow> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw notFound('user', id);
    }
    return row;
  }

  private async requireResettable(
    caller: AuthContext,
    id: string,
  ): Promise<{ row: UserRow; branchId: string | null }> {
    if (id === caller.userId) {
      throw new AppError('CANNOT_MODIFY_SELF', 'Use change-pin for your own PIN');
    }
    const { row, assignments } = await this.users.requireManageable(
      caller,
      id,
      'user.reset_credentials',
    );
    if (row.credentialType === 'password') {
      // The super admin unlocks by itself after 30 minutes and resets on the server (D-29).
      throw new AppError('ACCOUNT_PROTECTED', 'Super admin credentials are not reset here');
    }
    return { row, branchId: auditBranchOf(assignments.map((item) => item.branchId)) };
  }
}
