import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { DB } from '../../db/database.js';
import { permissions, rolePermissions, roles, userRoleAssignments } from './schema.js';

import type { Database, Executor } from '../../db/database.js';

/** A user's assignment joined with its group. */
export interface AssignmentRow {
  branchId: string | null;
  roleId: string;
  roleCode: string | null;
  roleName: (typeof roles.$inferSelect)['name'];
  roleVersion: number;
  isLocked: boolean;
  limits: (typeof roles.$inferSelect)['limits'];
}

/** Queries on the permission tables. Only the `rbac` module writes them. */
@Injectable()
export class RbacRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findAssignments(userId: string, executor: Executor = this.db): Promise<AssignmentRow[]> {
    return executor
      .select({
        branchId: userRoleAssignments.branchId,
        roleId: roles.id,
        roleCode: roles.code,
        roleName: roles.name,
        roleVersion: roles.version,
        isLocked: roles.isLocked,
        limits: roles.limits,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
      .where(eq(userRoleAssignments.userId, userId));
  }

  /** Live permission codes of each group, by group id. Deprecated codes are left out. */
  async findPermissionCodes(
    roleIds: readonly string[],
    executor: Executor = this.db,
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (roleIds.length === 0) {
      return result;
    }
    const rows = await executor
      .select({ roleId: rolePermissions.roleId, code: rolePermissions.permissionCode })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.code, rolePermissions.permissionCode))
      .where(
        and(inArray(rolePermissions.roleId, [...roleIds]), eq(permissions.isDeprecated, false)),
      );
    for (const row of rows) {
      result.set(row.roleId, [...(result.get(row.roleId) ?? []), row.code]);
    }
    return result;
  }

  /** Ids of the users assigned to a group, at any branch. */
  async findUserIdsByRole(roleId: string, executor: Executor = this.db): Promise<string[]> {
    const rows = await executor
      .selectDistinct({ userId: userRoleAssignments.userId })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.roleId, roleId));
    return rows.map((row) => row.userId);
  }

  /** Assignments with their group, optionally only those of some users. */
  listAssignments(
    userIds?: readonly string[],
    executor: Executor = this.db,
  ): Promise<AssignmentWithUserRow[]> {
    if (userIds?.length === 0) {
      return Promise.resolve([]);
    }
    return executor
      .select({
        userId: userRoleAssignments.userId,
        branchId: userRoleAssignments.branchId,
        roleId: roles.id,
        roleCode: roles.code,
        roleName: roles.name,
        isLocked: roles.isLocked,
        updatedAt: userRoleAssignments.updatedAt,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
      .where(userIds ? inArray(userRoleAssignments.userId, [...userIds]) : undefined);
  }

  async findRole(roleId: string, executor: Executor = this.db): Promise<RoleRow | undefined> {
    const [row] = await executor.select().from(roles).where(eq(roles.id, roleId));
    return row;
  }

  /** Sets the group of a user at a branch (`null`: all branches), replacing an existing one. */
  async upsertAssignment(
    values: { userId: string; branchId: string | null; roleId: string; createdBy: string | null },
    executor: Executor = this.db,
  ): Promise<void> {
    // NULLS NOT DISTINCT is on the constraint, so a conflict target with a null branch works too.
    await executor
      .insert(userRoleAssignments)
      .values(values)
      .onConflictDoUpdate({
        target: [userRoleAssignments.userId, userRoleAssignments.branchId],
        set: { roleId: values.roleId, updatedAt: new Date() },
      });
  }

  /** Removes the assignment of a user at a branch (`null`: all branches). Returns the removed group id. */
  async deleteAssignment(
    userId: string,
    branchId: string | null,
    executor: Executor = this.db,
  ): Promise<string | undefined> {
    const [row] = await executor
      .delete(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.userId, userId),
          branchId === null
            ? isNull(userRoleAssignments.branchId)
            : eq(userRoleAssignments.branchId, branchId),
        ),
      )
      .returning({ roleId: userRoleAssignments.roleId });
    return row?.roleId;
  }
}

/** An assignment of some user, joined with its group. */
export interface AssignmentWithUserRow {
  userId: string;
  branchId: string | null;
  roleId: string;
  roleCode: string | null;
  roleName: (typeof roles.$inferSelect)['name'];
  isLocked: boolean;
  updatedAt: Date;
}

/** A permission group row. */
export type RoleRow = typeof roles.$inferSelect;
