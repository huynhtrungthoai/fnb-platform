import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { localizedText, standardColumns, timestamps } from '../../db/columns.js';

import type { RoleLimits } from '@fnb/contract';

/**
 * Synchronised copy of the permissions declared in `@fnb/contract` (06 section 3.1).
 * Code is the source of truth; rows are never created from the UI.
 */
export const permissions = pgTable('permissions', {
  code: text('code').primaryKey(),
  /** Display module, the group on the tick screen. */
  module: text('module').notNull(),
  scope: text('scope').$type<'branch' | 'business'>().notNull(),
  isSensitive: boolean('is_sensitive').notNull().default(false),
  isApprovable: boolean('is_approvable').notNull().default(false),
  /** Set when the code no longer exists in the code base; kept so history stays readable. */
  isDeprecated: boolean('is_deprecated').notNull().default(false),
  ...timestamps(),
});

/** Permission groups. Business-wide: created once, used by every branch (06 section 3.2). */
export const roles = pgTable('roles', {
  ...standardColumns(),
  /** Stable code of a default group (`owner`, `manager`, ...); null for custom groups. */
  code: text('code').unique(),
  name: localizedText('name').notNull(),
  description: text('description'),
  /** Default group: cannot be deleted, can be restored to its defaults. */
  isSystem: boolean('is_system').notNull().default(false),
  /** Only the owner group: always every permission, never editable. */
  isLocked: boolean('is_locked').notNull().default(false),
  limits: jsonb('limits').$type<RoleLimits>().notNull(),
  /** Incremented on every change; clients compare it to know when to reload. */
  version: integer('version').notNull().default(1),
});

/** Which permissions a group holds. */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionCode] })],
);

/**
 * Which group a user belongs to at which branch (06 section 3.3). `branch_id` null means
 * "all branches", including branches created later. One row per user and branch; NULLS NOT
 * DISTINCT also limits a user to a single all-branches row.
 */
export const userRoleAssignments = pgTable(
  'user_role_assignments',
  {
    ...standardColumns(),
    userId: uuid('user_id').notNull(),
    branchId: uuid('branch_id'),
    roleId: uuid('role_id')
      .notNull()
      // A group that still has members cannot be deleted (06 section 8).
      .references(() => roles.id, { onDelete: 'restrict' }),
  },
  (table) => [
    unique('user_role_assignments_user_branch_unique')
      .on(table.userId, table.branchId)
      .nullsNotDistinct(),
    index('user_role_assignments_role_idx').on(table.roleId),
    index('user_role_assignments_branch_idx').on(table.branchId),
  ],
);
