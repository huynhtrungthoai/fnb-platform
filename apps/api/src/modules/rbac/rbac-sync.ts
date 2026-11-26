import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';

import { DEFAULT_ROLES, defaultPermissionsOf, PERMISSION_LIST } from '@fnb/contract';

import { permissions, rolePermissions, roles } from './schema.js';

import type { Database, Executor } from '../../db/database.js';
import type { DefaultRoleCode, PermissionCode } from '@fnb/contract';

/** Advisory lock id: two API instances starting together must not sync at the same time. */
const SYNC_LOCK_ID = 706_001;

/** What a catalog sync changed. */
export interface PermissionSyncResult {
  /** Codes that did not exist in the database before this sync. */
  added: PermissionCode[];
  /** Codes in the database that are no longer declared in code. */
  deprecated: string[];
}

async function grant(
  executor: Executor,
  roleId: string,
  codes: readonly PermissionCode[],
): Promise<void> {
  if (codes.length === 0) {
    return;
  }
  await executor
    .insert(rolePermissions)
    .values(codes.map((permissionCode) => ({ roleId, permissionCode })))
    .onConflictDoNothing();
}

/**
 * Copies the permissions declared in code into the database (CORE-20). Runs when the API starts.
 *  - new codes are inserted, changed attributes updated, codes gone from code marked deprecated
 *  - a new code is granted to the default groups named in its `defaultRoles`, never to custom groups
 *  - the owner group always ends up with every live permission (06 section 8)
 */
export async function syncPermissionCatalog(db: Database): Promise<PermissionSyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SYNC_LOCK_ID})`);

    const existing = new Set(
      (await tx.select({ code: permissions.code }).from(permissions)).map((row) => row.code),
    );
    const declared = PERMISSION_LIST.map((permission) => permission.code);
    const added = declared.filter((code) => !existing.has(code));

    for (const permission of PERMISSION_LIST) {
      const values = {
        module: permission.module,
        scope: permission.scope,
        isSensitive: permission.isSensitive,
        isApprovable: permission.isApprovable,
        isDeprecated: false,
      };
      await tx
        .insert(permissions)
        .values({ code: permission.code, ...values })
        .onConflictDoUpdate({ target: permissions.code, set: values });
    }

    const deprecatedRows = await tx
      .update(permissions)
      .set({ isDeprecated: true })
      .where(and(notInArray(permissions.code, declared), eq(permissions.isDeprecated, false)))
      .returning({ code: permissions.code });

    const systemRoles = await tx
      .select({ id: roles.id, code: roles.code, isLocked: roles.isLocked })
      .from(roles)
      .where(eq(roles.isSystem, true));
    for (const role of systemRoles) {
      if (role.isLocked) {
        await grant(tx, role.id, declared);
        continue;
      }
      const defaults = new Set(defaultPermissionsOf(role.code as DefaultRoleCode));
      await grant(
        tx,
        role.id,
        added.filter((code) => defaults.has(code)),
      );
    }

    return { added, deprecated: deprecatedRows.map((row) => row.code) };
  });
}

/**
 * Creates the default groups that do not exist yet, with their installation permissions and
 * limits (CORE-21). Existing groups are left alone: the owner may have edited them.
 */
export async function seedDefaultRoles(db: Database): Promise<DefaultRoleCode[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SYNC_LOCK_ID})`);
    const present = await tx
      .select({ code: roles.code })
      .from(roles)
      .where(
        inArray(
          roles.code,
          DEFAULT_ROLES.map((role) => role.code),
        ),
      );
    const presentCodes = new Set(present.map((row) => row.code));

    const created: DefaultRoleCode[] = [];
    for (const role of DEFAULT_ROLES) {
      if (presentCodes.has(role.code)) {
        continue;
      }
      const [row] = await tx
        .insert(roles)
        .values({
          code: role.code,
          name: role.name,
          description: role.description,
          isSystem: true,
          isLocked: role.isLocked,
          limits: role.limits,
        })
        .returning({ id: roles.id });
      if (row) {
        await grant(tx, row.id, defaultPermissionsOf(role.code));
        created.push(role.code);
      }
    }
    return created;
  });
}
