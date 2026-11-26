import { Inject, Injectable } from '@nestjs/common';

import { PERMISSION_CODES } from '@fnb/contract';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { REDIS } from '../../redis/redis.module.js';
import {
  effectivePermissionsOfGrant,
  grantablePermissions,
  hasPermissionAt,
  isOwnerAccess,
  missingPermissions,
  resolveEffectiveAccess,
  toPermissionCodes,
} from './access.js';
import { PermissionsEvents } from './permissions-events.js';
import { RbacRepository } from './rbac.repository.js';

import type { Executor } from '../../db/database.js';
import type { EffectiveAccess, RoleGrant, UserAccess } from './access.js';
import type { AssignmentRow, AssignmentWithUserRow } from './rbac.repository.js';
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
    private readonly events: PermissionsEvents,
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

  /**
   * Drops the cached access of these users; their next request reads fresh permissions. Also
   * tells their open clients through `permissions.changed` (CORE-28).
   */
  async invalidateUsers(userIds: readonly string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.redis.del(...userIds.map(cacheKey));
      await this.events.publishChanged(userIds);
    }
  }

  /** Drops the cached access of everyone assigned to the group. Returns the affected user ids. */
  async invalidateRole(roleId: string): Promise<string[]> {
    const userIds = await this.repository.findUserIdsByRole(roleId);
    await this.invalidateUsers(userIds);
    return userIds;
  }

  /** Assignments with their group, of some users or of everyone. */
  listAssignments(
    userIds?: readonly string[],
    executor?: Executor,
  ): Promise<AssignmentWithUserRow[]> {
    return this.repository.listAssignments(userIds, executor);
  }

  /** Users holding the locked owner group on an all-branches assignment. */
  async ownerUserIds(executor?: Executor): Promise<string[]> {
    const rows = await this.repository.listAssignments(undefined, executor);
    return rows.filter((row) => row.isLocked && row.branchId === null).map((row) => row.userId);
  }

  /** A group as a grant: what holding it would allow. Null when the group does not exist. */
  async getRoleGrant(roleId: string, executor?: Executor): Promise<RoleGrant | null> {
    const role = await this.repository.findRole(roleId, executor);
    if (!role) {
      return null;
    }
    const codes = await this.repository.findPermissionCodes([roleId], executor);
    return {
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      roleVersion: role.version,
      isLocked: role.isLocked,
      permissions: role.isLocked
        ? [...PERMISSION_CODES]
        : toPermissionCodes(codes.get(roleId) ?? []),
      limits: role.limits,
    };
  }

  /**
   * Checks that the caller may give this group to someone at the branch (`null`: all branches).
   * No self-escalation (06 section 8): the caller needs `role.assign` there and may only hand
   * out permissions they hold there themselves.
   */
  async assertCanGrant(
    caller: UserAccess,
    roleId: string,
    branchId: string | null,
    executor?: Executor,
  ): Promise<RoleGrant> {
    const held = grantablePermissions(caller, branchId);
    if (!held.includes('role.assign')) {
      throw permissionDenied('role.assign');
    }
    const grant = await this.getRoleGrant(roleId, executor);
    if (!grant) {
      throw notFound('role', roleId);
    }
    if (grant.isLocked && (branchId !== null || !isOwnerAccess(caller))) {
      // The owner group means "every permission, everywhere": only an owner hands it out, and
      // only on the all-branches assignment (plans/10-foundation.md, D-29).
      throw roleEscalation([]);
    }
    const missing = missingPermissions(
      held,
      effectivePermissionsOfGrant(grant.permissions, branchId),
    );
    if (missing.length > 0) {
      throw roleEscalation(missing);
    }
    return grant;
  }

  /**
   * Checks that the caller may act on another user with `permission` (edit, disable, reset PIN):
   * at every place the target is assigned, the caller must hold the permission and at least the
   * target's permissions. A branch manager therefore cannot touch the owner or staff of other branches.
   */
  assertCovers(caller: UserAccess, target: UserAccess, permission: PermissionCode): void {
    const places: (string | null)[] = [
      ...(target.allBranches ? [null] : []),
      ...Object.keys(target.branches),
    ];
    if (places.length === 0) {
      // An account without any assignment belongs to no branch: only an all-branches caller reaches it.
      places.push(null);
    }
    for (const branchId of places) {
      const held = grantablePermissions(caller, branchId);
      if (!held.includes(permission)) {
        throw permissionDenied(permission);
      }
      const targetGrant = branchId === null ? target.allBranches : target.branches[branchId];
      const missing = missingPermissions(
        held,
        effectivePermissionsOfGrant(targetGrant?.permissions ?? [], branchId),
      );
      if (missing.length > 0) {
        throw roleEscalation(missing);
      }
    }
  }

  /** Sets the group of a user at a branch (`null`: all branches). Callers check `assertCanGrant` first. */
  async setAssignment(
    assignment: {
      userId: string;
      branchId: string | null;
      roleId: string;
      createdBy: string | null;
    },
    executor?: Executor,
  ): Promise<void> {
    await this.repository.upsertAssignment(assignment, executor);
    await this.invalidateUsers([assignment.userId]);
  }

  /** Removes the group of a user at a branch. Returns the id of the removed group, if there was one. */
  async removeAssignment(
    userId: string,
    branchId: string | null,
    executor?: Executor,
  ): Promise<string | undefined> {
    const roleId = await this.repository.deleteAssignment(userId, branchId, executor);
    await this.invalidateUsers([userId]);
    return roleId;
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
      isLocked: row.isLocked,
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

/** The 403 for trying to hand out, or act above, permissions the caller does not hold. */
export function roleEscalation(missing: readonly PermissionCode[]): AppError {
  return new AppError('ROLE_ESCALATION', 'Caller does not hold these permissions', {
    params: { missingPermissions: [...missing] },
  });
}
