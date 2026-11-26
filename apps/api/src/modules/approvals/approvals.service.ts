import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { APPROVAL_TTL_SECONDS, getPermission, permissionCodeSchema } from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { REDIS } from '../../redis/redis.module.js';
import { AuditService } from '../audit/audit.service.js';
import { hasPermissionAt } from '../rbac/access.js';
import { RbacService } from '../rbac/rbac.service.js';
import { UserCredentialsService } from '../users/user-credentials.service.js';
import { isLockedNow, UsersService } from '../users/users.service.js';

import type { Approval, Approver, CreateApproval, PermissionCode } from '@fnb/contract';
import type { Redis } from 'ioredis';

/** Decides which permissions may be approved on the spot. Tests replace it. */
export const IS_APPROVABLE = Symbol('IS_APPROVABLE');

/** The default rule: the permission is declared `approvable` (06 section 3.1). */
export const isApprovablePermission = (code: PermissionCode): boolean =>
  getPermission(code).isApprovable;

/** What a stored approval says; consumed once by the action it approves. */
export interface GrantedApproval {
  id: string;
  permission: PermissionCode;
  branchId: string;
  requesterUserId: string;
  approverUserId: string;
  reason: string;
}

const approvalKey = (token: string): string => `approval:${token}`;

/**
 * On-the-spot approval (CORE-24, 06 section 6): a person who holds the permission at this branch
 * types their PIN on the requester's screen. The result is a single-use token, valid for two
 * minutes, that the requester sends with the action. The session stays the requester's.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly users: UsersService,
    private readonly credentials: UserCredentialsService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(IS_APPROVABLE) private readonly isApprovable: (code: PermissionCode) => boolean,
  ) {}

  /** Active, unlocked people who hold the permission at the branch, by name (D-22). */
  async listApprovers(
    permission: PermissionCode,
    branchId: string,
    requesterUserId: string,
  ): Promise<Approver[]> {
    this.assertApprovable(permission);
    const userIds = [...new Set((await this.rbac.listAssignments()).map((row) => row.userId))];
    const candidates: string[] = [];
    for (const userId of userIds) {
      if (userId === requesterUserId) {
        continue;
      }
      const access = await this.rbac.getUserAccess(userId);
      if (hasPermissionAt(access, permission, branchId)) {
        candidates.push(userId);
      }
    }
    const now = new Date();
    return (await this.users.findRows(candidates))
      .filter((row) => row.isActive && !isLockedNow(row, now))
      .map((row) => ({ userId: row.id, fullName: row.fullName, avatarMediaId: row.avatarMediaId }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }

  /** Checks the approver's PIN and grants a single-use approval. Wrong PINs count towards their lockout. */
  async grant(input: CreateApproval, branchId: string, requesterUserId: string): Promise<Approval> {
    this.assertApprovable(input.permission);
    if (input.approverUserId === requesterUserId) {
      // Nobody approves their own request (06 section 6).
      throw new AppError('PERMISSION_DENIED', 'Requesters cannot approve themselves', {
        params: { requiredPermission: input.permission },
      });
    }
    const approver = await this.users.findRow(input.approverUserId);
    if (!approver?.isActive) {
      throw notFound('user', input.approverUserId);
    }
    const isHolder = await this.rbac.hasPermission(approver.id, input.permission, branchId);
    if (!isHolder) {
      throw new AppError('PERMISSION_DENIED', 'Approver does not hold this permission here', {
        params: { requiredPermission: input.permission },
      });
    }
    const check = await this.credentials.checkSecret(approver, input.pin, 'pin');
    if (!check.isValid) {
      await this.audit.record({
        action: 'approval.reject',
        entityType: 'user',
        entityId: approver.id,
        branchId,
        metadata: {
          permission: input.permission,
          approverUserId: approver.id,
          isLocked: check.isLocked,
        },
      });
      throw check.isLocked
        ? new AppError('ACCOUNT_LOCKED', 'Approver account locked')
        : new AppError('INVALID_CREDENTIALS', 'Wrong approver PIN');
    }
    const token = randomBytes(24).toString('base64url');
    const granted: GrantedApproval = {
      id: uuidv7(),
      permission: input.permission,
      branchId,
      requesterUserId,
      approverUserId: approver.id,
      reason: input.reason,
    };
    await this.redis.set(approvalKey(token), JSON.stringify(granted), 'EX', APPROVAL_TTL_SECONDS);
    await this.audit.record({
      action: 'approval.grant',
      entityType: 'approval',
      entityId: granted.id,
      branchId,
      metadata: { ...granted },
    });
    return {
      id: granted.id,
      token,
      permission: granted.permission,
      approverUserId: approver.id,
      expiresAt: new Date(Date.now() + APPROVAL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  /**
   * Spends an approval for one action. It must be for this permission, branch and requester;
   * otherwise, or once used or expired, `403 APPROVAL_INVALID`.
   */
  async consume(
    token: string,
    expected: { permission: PermissionCode; branchId: string; requesterUserId: string },
  ): Promise<GrantedApproval> {
    const raw = await this.redis.get(approvalKey(token));
    const granted = raw ? parseGranted(raw) : null;
    const isMatch =
      granted?.permission === expected.permission &&
      granted.branchId === expected.branchId &&
      granted.requesterUserId === expected.requesterUserId;
    // A mismatch leaves the token for its real action; DEL decides who spends it first.
    if (!granted || !isMatch || (await this.redis.del(approvalKey(token))) !== 1) {
      throw new AppError(
        'APPROVAL_INVALID',
        'Approval missing, used, expired or for another action',
      );
    }
    return granted;
  }

  /** True when a missing permission may be replaced by an approval. */
  isApprovableCode(permission: PermissionCode): boolean {
    return this.isApprovable(permission);
  }

  private assertApprovable(permission: PermissionCode): void {
    if (!this.isApprovable(permission)) {
      throw new AppError('NOT_APPROVABLE', `${permission} cannot be approved on the spot`, {
        params: { permission },
      });
    }
  }
}

const grantedApprovalSchema = z.object({
  id: z.uuid(),
  permission: permissionCodeSchema,
  branchId: z.uuid(),
  requesterUserId: z.uuid(),
  approverUserId: z.uuid(),
  reason: z.string(),
});

function parseGranted(raw: string): GrantedApproval | null {
  try {
    const parsed = grantedApprovalSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
