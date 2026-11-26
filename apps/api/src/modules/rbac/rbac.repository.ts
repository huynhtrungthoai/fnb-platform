import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

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
}
