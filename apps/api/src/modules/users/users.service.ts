import { Inject, Injectable } from '@nestjs/common';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { Paginated } from '../../common/http/pagination.js';
import { DB } from '../../db/database.js';
import { isUniqueViolation } from '../../db/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session/session.service.js';
import { BranchesService } from '../branches/branches.service.js';
import {
  branchReach,
  effectivePermissionsOfGrant,
  grantablePermissions,
  isOwnerAccess,
  missingPermissions,
  reachesBranch,
  resolveEffectiveAccess,
} from '../rbac/access.js';
import { permissionDenied, RbacService, roleEscalation } from '../rbac/rbac.service.js';
import { CredentialHasher } from './credential-hasher.js';
import {
  groupByUser,
  isUserVisible,
  matchesAssignmentFilter,
  visibleAssignments,
} from './user-reach.js';
import { UsersRepository } from './users.repository.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Database } from '../../db/database.js';
import type { BranchReach, RoleGrant, UserAccess } from '../rbac/access.js';
import type { AssignmentWithUserRow } from '../rbac/rbac.repository.js';
import type { UserRow } from './users.repository.js';
import type {
  BranchSummary,
  CreateUser,
  PermissionCode,
  SetAssignment,
  UpdateUser,
  User,
  UserAccessView,
  UserBranchAccess,
  UserListQuery,
  UserWithAssignments,
} from '@fnb/contract';

/** True while a PIN or password lock is in force. A super admin lock lifts at `locked_until`. */
export function isLockedNow(row: UserRow, now: Date): boolean {
  return row.lockedAt !== null && (row.lockedUntil === null || row.lockedUntil > now);
}

/** Converts a user row to the response shape. Hashes never leave this function. */
export function toUser(row: UserRow, now: Date = new Date()): User {
  const isLocked = isLockedNow(row, now);
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    phone: row.phone,
    avatarMediaId: row.avatarMediaId,
    credentialType: row.credentialType,
    isActive: row.isActive,
    isLocked,
    lockedUntil: isLocked ? (row.lockedUntil?.toISOString() ?? null) : null,
    mustChangePin: row.mustChangePin,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Branch of an audit row about these assignments: the one branch they share, else business level. */
export function auditBranchOf(branchIds: readonly (string | null)[]): string | null {
  const distinct = new Set(branchIds);
  const [only] = [...distinct];
  return distinct.size === 1 && only !== undefined ? only : null;
}

/**
 * Staff accounts and their group per branch (CORE-10, CORE-11). Every check follows 06 section 8:
 * a caller acts on a user only where the caller holds the permission and at least the user's
 * permissions, and never hands out a permission the caller does not hold.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly rbac: RbacService,
    private readonly branches: BranchesService,
    private readonly sessions: SessionService,
    private readonly hasher: CredentialHasher,
    private readonly audit: AuditService,
    @Inject(DB) private readonly db: Database,
  ) {}

  /** The account behind a username, hashes included. For the login flow only; never sent out. */
  findForLogin(username: string): Promise<UserRow | undefined> {
    return this.repository.findByUsername(username.trim().toLowerCase());
  }

  /** The account by id, hashes included. For the auth module only. */
  findRow(id: string): Promise<UserRow | undefined> {
    return this.repository.findById(id);
  }

  /** Accounts by id, hashes included. For other modules' server-side checks only. */
  findRows(ids: readonly string[]): Promise<UserRow[]> {
    return this.repository.findByIds(ids);
  }

  /** The caller's own account, without assignments. */
  async getSelf(id: string): Promise<User> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw notFound('user', id);
    }
    return toUser(row);
  }

  /** A successful sign-in: clears the failure counter and stamps the time. */
  async recordLogin(id: string, now: Date = new Date()): Promise<void> {
    await this.repository.update(id, {
      lastLoginAt: now,
      failedAttempts: 0,
      lockedAt: null,
      lockedUntil: null,
    });
  }

  /** Users the caller may see through `user.view`, one page at a time. */
  async list(caller: AuthContext, query: UserListQuery): Promise<Paginated<UserWithAssignments>> {
    const reach = branchReach(caller.access, 'user.view');
    const [userIds, assignments] = await Promise.all([
      this.repository.listIds(),
      this.rbac.listAssignments(),
    ]);
    const byUser = groupByUser(assignments);
    const ids = userIds.filter((id) => {
      const rows = byUser.get(id) ?? [];
      return isUserVisible(reach, rows) && matchesAssignmentFilter(rows, query);
    });
    const { rows, total } = await this.repository.list(
      { ids, search: query.search, status: query.status, now: new Date() },
      query,
    );
    const users = await this.withAssignments(rows, reach, byUser);
    return new Paginated(users, total, query);
  }

  async getById(caller: AuthContext, id: string): Promise<UserWithAssignments> {
    const reach = branchReach(caller.access, 'user.view');
    const { row, assignments } = await this.requireVisible(reach, id);
    const [user] = await this.withAssignments([row], reach, new Map([[id, assignments]]));
    if (!user) {
      throw notFound('user', id);
    }
    return user;
  }

  /** Creates an account with a temporary PIN and its first assignments (D-29). */
  async create(caller: AuthContext, input: CreateUser): Promise<UserWithAssignments> {
    for (const assignment of input.assignments) {
      this.requireAt(caller.access, assignment.branchId, 'user.manage');
      await this.requireBranch(assignment.branchId);
      await this.rbac.assertCanGrant(caller.access, assignment.roleId, assignment.branchId);
    }
    const pinHash = await this.hasher.hash(input.pin);
    let row: UserRow;
    try {
      row = await this.db.transaction(async (tx) => {
        const inserted = await this.repository.insert(
          {
            ...(input.id ? { id: input.id } : {}),
            username: input.username,
            fullName: input.fullName,
            phone: input.phone,
            credentialType: 'pin',
            pinHash,
            mustChangePin: true,
            createdBy: caller.userId,
          },
          tx,
        );
        for (const assignment of input.assignments) {
          await this.rbac.setAssignment(
            { userId: inserted.id, ...assignment, createdBy: caller.userId },
            tx,
          );
        }
        return inserted;
      });
    } catch (error) {
      throw isUniqueViolation(error)
        ? new AppError('USERNAME_TAKEN', `Username ${input.username} is taken`, {
            params: { username: input.username },
          })
        : error;
    }
    await this.rbac.invalidateUsers([row.id]);
    const user = await this.getById(caller, row.id);
    this.audit.describe({
      entityType: 'user',
      entityId: row.id,
      after: user,
      branchId: auditBranchOf(input.assignments.map((item) => item.branchId)),
    });
    return user;
  }

  /** Name, phone, photo. The username never changes. */
  async update(caller: AuthContext, id: string, input: UpdateUser): Promise<UserWithAssignments> {
    const before = await this.requireManageable(caller, id, 'user.manage');
    const row = (await this.repository.update(id, input)) ?? before.row;
    const after = toUser(row);
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: toUser(before.row),
      after,
      branchId: auditBranchOf(before.assignments.map((item) => item.branchId)),
    });
    return this.getById(caller, id);
  }

  /** Disables or enables an account. Disabling ends every session at once (CORE-15). */
  async setActive(
    caller: AuthContext,
    id: string,
    isActive: boolean,
  ): Promise<UserWithAssignments> {
    if (id === caller.userId) {
      throw new AppError('CANNOT_MODIFY_SELF', 'Callers cannot disable or enable themselves');
    }
    const target = await this.requireManageable(caller, id, 'user.manage');
    if (!isActive && target.row.isActive && isOwnerAccess(target.access)) {
      await this.assertAnotherActiveOwner(id);
    }
    if (target.row.isActive !== isActive) {
      await this.repository.update(id, { isActive });
    }
    if (!isActive) {
      await this.sessions.endAllOfUser(id);
    }
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: { isActive: target.row.isActive },
      after: { isActive },
      branchId: auditBranchOf(target.assignments.map((item) => item.branchId)),
    });
    return this.getById(caller, id);
  }

  /** Sets the group of a user at one branch, or at all branches (CORE-11). */
  async assign(
    caller: AuthContext,
    id: string,
    input: SetAssignment,
  ): Promise<UserWithAssignments> {
    const target = await this.requireAssignable(caller, id, input.branchId);
    await this.requireBranch(input.branchId);
    const grant = await this.rbac.assertCanGrant(caller.access, input.roleId, input.branchId);
    const current = this.grantAt(target.access, input.branchId);
    if (input.branchId === null && current?.isLocked && !grant.isLocked && target.row.isActive) {
      await this.assertAnotherActiveOwner(id);
    }
    await this.rbac.setAssignment({
      userId: id,
      branchId: input.branchId,
      roleId: input.roleId,
      createdBy: caller.userId,
    });
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: current ? { branchId: input.branchId, roleId: current.roleId } : null,
      after: { branchId: input.branchId, roleId: input.roleId },
      branchId: input.branchId,
    });
    return this.getById(caller, id);
  }

  /** Removes the group of a user at one branch, or the all-branches one. */
  async unassign(
    caller: AuthContext,
    id: string,
    branchId: string | null,
  ): Promise<UserWithAssignments> {
    const target = await this.requireAssignable(caller, id, branchId);
    const current = this.grantAt(target.access, branchId);
    if (!current) {
      throw notFound('assignment', branchId ?? 'all');
    }
    if (branchId === null && current.isLocked && target.row.isActive) {
      await this.assertAnotherActiveOwner(id);
    }
    await this.rbac.removeAssignment(id, branchId);
    this.audit.describe({
      entityType: 'user',
      entityId: id,
      before: { branchId, roleId: current.roleId },
      after: null,
      branchId,
    });
    return this.getById(caller, id);
  }

  /** Effective permissions of a user at each branch the caller may see (CORE-29). */
  async getAccess(caller: AuthContext, id: string): Promise<UserAccessView> {
    const reach = branchReach(caller.access, 'user.view');
    await this.requireVisible(reach, id);
    const access = await this.rbac.getUserAccess(id);
    const summaries = access.allBranches
      ? await this.branches.allSummaries()
      : await this.branches.summariesByIds(Object.keys(access.branches));
    const branches: UserBranchAccess[] = [];
    for (const branch of summaries) {
      if (!reachesBranch(reach, branch.id)) {
        continue;
      }
      const effective = resolveEffectiveAccess(access, branch.id);
      if (!effective) {
        continue;
      }
      branches.push({
        branch,
        role: { id: effective.roleId, code: effective.roleCode, name: effective.roleName },
        isAllBranches: effective.isAllBranches,
        permissions: effective.permissions,
        limits: effective.limits,
      });
    }
    const all = access.allBranches;
    return {
      userId: id,
      allBranches: all
        ? {
            branch: null,
            role: { id: all.roleId, code: all.roleCode, name: all.roleName },
            isAllBranches: true,
            permissions: all.permissions,
            limits: all.limits,
          }
        : null,
      branches,
    };
  }

  /** The grant of a user at a branch (`null`: the all-branches assignment), if any. */
  private grantAt(access: UserAccess, branchId: string | null): RoleGrant | null {
    return (branchId === null ? access.allBranches : access.branches[branchId]) ?? null;
  }

  /** Throws unless the caller holds `code` at that place (`null`: on the all-branches assignment). */
  private requireAt(caller: UserAccess, branchId: string | null, code: PermissionCode): void {
    if (!grantablePermissions(caller, branchId).includes(code)) {
      throw permissionDenied(code);
    }
  }

  private async requireBranch(branchId: string | null): Promise<void> {
    if (branchId !== null && !(await this.branches.exists(branchId))) {
      throw notFound('branch', branchId);
    }
  }

  /** A user the caller may see; 404 otherwise, so other branches' staff are not disclosed. */
  private async requireVisible(
    reach: BranchReach,
    id: string,
  ): Promise<{ row: UserRow; assignments: AssignmentWithUserRow[] }> {
    const [row, assignments] = await Promise.all([
      this.repository.findById(id),
      this.rbac.listAssignments([id]),
    ]);
    if (!row || !isUserVisible(reach, assignments)) {
      throw notFound('user', id);
    }
    return { row, assignments };
  }

  /** A user the caller may act on with `code`: visible, and covered at every place (06 section 8). */
  async requireManageable(
    caller: AuthContext,
    id: string,
    code: PermissionCode,
  ): Promise<{ row: UserRow; assignments: AssignmentWithUserRow[]; access: UserAccess }> {
    const visible = await this.requireVisible(branchReach(caller.access, 'user.view'), id);
    const access = await this.rbac.getUserAccess(id);
    this.rbac.assertCovers(caller.access, access, code);
    return { ...visible, access };
  }

  /**
   * A user whose group at one place the caller may change: not the caller (no self-assignment),
   * visible, and the current group there is not above the caller's permissions.
   */
  private async requireAssignable(
    caller: AuthContext,
    id: string,
    branchId: string | null,
  ): Promise<{ row: UserRow; access: UserAccess }> {
    if (id === caller.userId) {
      throw new AppError('CANNOT_MODIFY_SELF', 'Callers cannot change their own groups');
    }
    const { row } = await this.requireVisible(branchReach(caller.access, 'user.view'), id);
    this.requireAt(caller.access, branchId, 'role.assign');
    const access = await this.rbac.getUserAccess(id);
    const current = this.grantAt(access, branchId);
    if (current) {
      const missing = missingPermissions(
        grantablePermissions(caller.access, branchId),
        effectivePermissionsOfGrant(current.permissions, branchId),
      );
      if (missing.length > 0) {
        throw roleEscalation(missing);
      }
    }
    return { row, access };
  }

  /** Throws `LAST_OWNER` unless an active owner other than `userId` remains (06 section 8). */
  private async assertAnotherActiveOwner(userId: string): Promise<void> {
    const others = (await this.rbac.ownerUserIds()).filter((id) => id !== userId);
    if ((await this.repository.countActive(others)) === 0) {
      throw new AppError('LAST_OWNER', 'At least one active owner must remain');
    }
  }

  /** Adds the assignments the caller may see, with branch names, to user rows. */
  private async withAssignments(
    rows: readonly UserRow[],
    reach: BranchReach,
    byUser: ReadonlyMap<string, readonly AssignmentWithUserRow[]>,
  ): Promise<UserWithAssignments[]> {
    const now = new Date();
    const visibleByUser = new Map(
      rows.map((row) => [row.id, visibleAssignments(reach, byUser.get(row.id) ?? [])]),
    );
    const branchIds = new Set<string>();
    for (const list of visibleByUser.values()) {
      for (const item of list) {
        if (item.branchId !== null) {
          branchIds.add(item.branchId);
        }
      }
    }
    const summaries = new Map<string, BranchSummary>(
      (await this.branches.summariesByIds([...branchIds])).map((branch) => [branch.id, branch]),
    );
    return rows.map((row) => ({
      ...toUser(row, now),
      assignments: (visibleByUser.get(row.id) ?? [])
        // A branch missing from the summaries is skipped rather than shown as "all branches".
        .filter((item) => item.branchId === null || summaries.has(item.branchId))
        .map((item) => ({
          branch: item.branchId === null ? null : (summaries.get(item.branchId) ?? null),
          role: { id: item.roleId, code: item.roleCode, name: item.roleName },
          since: item.updatedAt.toISOString(),
        }))
        .sort((a, b) => (a.branch?.code ?? '').localeCompare(b.branch?.code ?? '')),
    }));
  }
}
