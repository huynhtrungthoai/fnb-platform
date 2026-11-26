import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { defaultPermissionsOf, PERMISSION_CODES } from '@fnb/contract';

import { createTestApp } from '../../test/test-app.js';
import { seedDefaultRoles, syncPermissionCatalog } from './rbac-sync.js';
import { permissions, rolePermissions, roles } from './schema.js';

import type { TestApp } from '../../test/test-app.js';

let test: TestApp;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.close();
});

async function permissionsOfRole(code: string): Promise<string[]> {
  const rows = await test.db
    .select({ permissionCode: rolePermissions.permissionCode })
    .from(rolePermissions)
    .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
    .where(eq(roles.code, code));
  return rows.map((row) => row.permissionCode).sort();
}

describe('permission catalog sync', () => {
  it('copies every declared permission into the database with its attributes', async () => {
    const rows = await test.db.select().from(permissions);
    expect(rows.map((row) => row.code).sort()).toEqual([...PERMISSION_CODES].sort());
    expect(rows.find((row) => row.code === 'branch.manage')).toMatchObject({
      module: 'foundation',
      scope: 'business',
      isSensitive: true,
      isDeprecated: false,
    });
  });

  it('is idempotent', async () => {
    const second = await syncPermissionCatalog(test.db);
    expect(second).toEqual({ added: [], deprecated: [] });
    expect(await test.db.select().from(permissions)).toHaveLength(PERMISSION_CODES.length);
  });

  it('marks a code that left the code base as deprecated, and revives it if it comes back', async () => {
    await test.db
      .insert(permissions)
      .values({ code: 'legacy.thing', module: 'foundation', scope: 'branch' });
    const result = await syncPermissionCatalog(test.db);
    expect(result.deprecated).toEqual(['legacy.thing']);

    await test.db
      .update(permissions)
      .set({ isDeprecated: true })
      .where(eq(permissions.code, 'user.view'));
    await syncPermissionCatalog(test.db);
    const [revived] = await test.db
      .select()
      .from(permissions)
      .where(eq(permissions.code, 'user.view'));
    expect(revived?.isDeprecated).toBe(false);
  });
});

describe('default groups', () => {
  it('seeds the seven groups with their default permissions and limits', async () => {
    const rows = await test.db.select().from(roles);
    expect(rows.map((row) => row.code).sort()).toEqual(
      ['accountant', 'cashier', 'kitchen', 'manager', 'owner', 'staff', 'stock_keeper'].sort(),
    );
    expect(rows.every((row) => row.isSystem)).toBe(true);
    expect(rows.filter((row) => row.isLocked).map((row) => row.code)).toEqual(['owner']);

    const cashier = rows.find((row) => row.code === 'cashier');
    expect(cashier?.name).toEqual({ vi: 'Thu ngân', en: 'Cashier' });
    expect(cashier?.limits).toEqual({
      maxDiscountPercent: 10,
      maxPayOutAmount: 200_000,
      maxRefundAmount: null,
    });

    expect(await permissionsOfRole('owner')).toEqual([...PERMISSION_CODES].sort());
    expect(await permissionsOfRole('manager')).toEqual(defaultPermissionsOf('manager').sort());
    expect(await permissionsOfRole('accountant')).toEqual(
      defaultPermissionsOf('accountant').sort(),
    );
  });

  it('does not recreate or reset groups on a second seed', async () => {
    const [manager] = await test.db.select().from(roles).where(eq(roles.code, 'manager'));
    await test.db.delete(rolePermissions).where(eq(rolePermissions.roleId, manager?.id ?? ''));

    expect(await seedDefaultRoles(test.db)).toEqual([]);
    expect(await test.db.select().from(roles)).toHaveLength(7);
    // The owner removed the manager's permissions on purpose; the seed must not put them back.
    expect(await permissionsOfRole('manager')).toEqual([]);
  });

  it('grants a new permission to the default groups named by it and to the owner, not to custom groups', async () => {
    // Simulate an update that introduces `audit.view`: remove it as if it had never existed.
    await test.db.delete(rolePermissions).where(eq(rolePermissions.permissionCode, 'audit.view'));
    await test.db.delete(permissions).where(eq(permissions.code, 'audit.view'));
    const [custom] = await test.db
      .insert(roles)
      .values({
        name: { vi: 'Thu ngân kiêm kho' },
        limits: { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null },
      })
      .returning();
    await test.db
      .insert(rolePermissions)
      .values({ roleId: custom?.id ?? '', permissionCode: 'user.view' });

    const result = await syncPermissionCatalog(test.db);

    expect(result.added).toEqual(['audit.view']);
    expect(await permissionsOfRole('owner')).toContain('audit.view');
    expect(await permissionsOfRole('manager')).toContain('audit.view');
    expect(await permissionsOfRole('cashier')).not.toContain('audit.view');
    const customRows = await test.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, custom?.id ?? ''));
    expect(customRows.map((row) => row.permissionCode)).toEqual(['user.view']);
  });

  it('does not re-grant an existing permission that the owner removed from a default group', async () => {
    const [manager] = await test.db.select().from(roles).where(eq(roles.code, 'manager'));
    await test.db.delete(rolePermissions).where(eq(rolePermissions.roleId, manager?.id ?? ''));
    await syncPermissionCatalog(test.db);
    expect(await permissionsOfRole('manager')).toEqual([]);
  });
});
