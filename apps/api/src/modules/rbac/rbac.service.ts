import { Inject, Injectable } from '@nestjs/common';

import { PERMISSION_CODES } from '@fnb/contract';

import { AppError } from '../../common/errors/app-error.js';
import { REDIS } from '../../redis/redis.module.js';
import { hasPermissionAt, resolveEffectiveAccess, toPermissionCodes } from './access.js';
import { RbacRepository } from './rbac.repository.js';

import type { EffectiveAccess, RoleGrant, UserAccess } from './access.js';
import type { AssignmentRow } from './rbac.repository.js';
import type { PermissionCode } from '@fnb/contract';
import type { Redis } from 'ioredis';

/**
 * Safety net only: the cache is deleted whenever a group or an assignment changes, so a change
 * takes effect at once. The expiry bounds the damage of a missed invalidation.
 */
const ACCESS_CACHE_TTL_SECONDS = 600;

const cacheKey = (userId: string): string => `rbac:access:${userId}`;

/**
 * Reads what a user may do (06 section 7.1). Permissions are not in the access token: every
 * request reads them from the cache, so revoking a permission works without waiting for a token
 * to expire. Other modules check permissions through this service, never through the tables.
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly repository: RbacRepository,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Every assignment of the user with the permissions of each group. Cached per user. */
  async getUserAccess(userId: string): Promise<UserAccess> {
    const cached = await this.readCache(userId);
    if (cached) {
      return cached;
    }
    const access = await this.loadUserAccess(userId);
    await this.redis.set(cacheKey(userId), JSON.stringify(access), 'EX', ACCESS_CACHE_TTL_SECONDS);
    return access;
  }

  /** What the user may do at one branch, or null when not assigned there. */
  async getEffectiveAccess(userId: string, branchId: string): Promise<EffectiveAccess | null> {
    return resolveEffectiveAccess(await this.getUserAccess(userId), branchId);
  }

  async hasPermission(userId: string, code: PermissionCode, branchId?: string): Promise<boolean> {
    return hasPermissionAt(await this.getUserAccess(userId), code, branchId);
  }

  /** Throws `PERMISSION_DENIED` unless the user holds the permission at the branch. */
  async assertPermission(userId: string, code: PermissionCode, branchId?: string): Promise<void> {
    if (!(await this.hasPermission(userId, code, branchId))) {
      throw permissionDenied(code);
    }
  }

  /** Drops the cached access of these users; their next request reads fresh permissions. */
  async invalidateUsers(userIds: readonly string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.redis.del(...userIds.map(cacheKey));
    }
  }

  /** Drops the cached access of everyone assigned to the group. Returns the affected user ids. */
  async invalidateRole(roleId: string): Promise<string[]> {
    const userIds = await this.repository.findUserIdsByRole(roleId);
    await this.invalidateUsers(userIds);
    return userIds;
  }

  private async readCache(userId: string): Promise<UserAccess | null> {
    const raw = await this.redis.get(cacheKey(userId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserAccess;
    } catch {
      return null;
    }
  }

  private async loadUserAccess(userId: string): Promise<UserAccess> {
    const assignments = await this.repository.findAssignments(userId);
    const codesByRole = await this.repository.findPermissionCodes([
      ...new Set(assignments.map((assignment) => assignment.roleId)),
    ]);
    const toGrant = (row: AssignmentRow): RoleGrant => ({
      roleId: row.roleId,
      roleCode: row.roleCode,
      roleName: row.roleName,
      roleVersion: row.roleVersion,
      // The locked owner group holds every permission, including ones added by a later release.
      permissions: row.isLocked
        ? [...PERMISSION_CODES]
        : toPermissionCodes(codesByRole.get(row.roleId) ?? []),
      limits: row.limits,
    });

    const access: UserAccess = { userId, allBranches: null, branches: {} };
    for (const row of assignments) {
      if (row.branchId === null) {
        access.allBranches = toGrant(row);
      } else {
        access.branches[row.branchId] = toGrant(row);
      }
    }
    return access;
  }
}

/** The 403 every permission failure answers with; the client reads `requiredPermission`. */
export function permissionDenied(code: PermissionCode): AppError {
  return new AppError('PERMISSION_DENIED', `Missing permission ${code}`, {
    params: { requiredPermission: code },
  });
}
