import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/database.js';
import { permissions, rolePermissions, roles, userRoleAssignments } from './schema.js';

import type { Database, Executor } from '../../db/database.js';
import type { PermissionCode } from '@fnb/contract';

/** A permission group row. */
export type RoleRecord = typeof roles.$inferSelect;
/** A row of the synchronised permission catalog. */
export type PermissionRecord = typeof permissions.$inferSelect;

/** Writes on the permission groups. Only the `rbac` module touches these tables. */
@Injectable()
export class RolesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Runs work in one transaction. */
  transaction<T>(work: (tx: Executor) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  list(executor: Executor = this.db): Promise<RoleRecord[]> {
    return executor
      .select()
      .from(roles)
      .orderBy(sql`${roles.isSystem} desc`, asc(roles.createdAt), asc(roles.id));
  }

  async findById(id: string, executor: Executor = this.db): Promise<RoleRecord | undefined> {
    const [row] = await executor.select().from(roles).where(eq(roles.id, id));
    return row;
  }

  /** People assigned to each group, by group id. */
  async memberCounts(executor: Executor = this.db): Promise<Map<string, number>> {
    const rows = await executor
      .select({ roleId: userRoleAssignments.roleId, total: count() })
      .from(userRoleAssignments)
      .groupBy(userRoleAssignments.roleId);
    return new Map(rows.map((row) => [row.roleId, row.total]));
  }

  async insert(
    values: typeof roles.$inferInsert,
    executor: Executor = this.db,
  ): Promise<RoleRecord> {
    const [row] = await executor.insert(roles).values(values).returning();
    if (!row) {
      throw new Error('Role insert returned no row');
    }
    return row;
  }

  /** Updates a group and bumps its version, so clients know to reload. */
  async update(
    id: string,
    values: Partial<Pick<RoleRecord, 'name' | 'description' | 'limits'>>,
    executor: Executor = this.db,
  ): Promise<void> {
    await executor
      .update(roles)
      .set({ ...values, version: sql`${roles.version} + 1` })
      .where(eq(roles.id, id));
  }

  async delete(id: string, executor: Executor = this.db): Promise<void> {
    await executor.delete(roles).where(eq(roles.id, id));
  }

  /** Replaces the permissions of a group. */
  async setPermissions(
    roleId: string,
    codes: readonly PermissionCode[],
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (codes.length > 0) {
      await executor
        .insert(rolePermissions)
        .values(codes.map((permissionCode) => ({ roleId, permissionCode })));
    }
  }

  /** The live catalog, in no particular order. */
  listPermissions(executor: Executor = this.db): Promise<PermissionRecord[]> {
    return executor.select().from(permissions).where(eq(permissions.isDeprecated, false));
  }
}
