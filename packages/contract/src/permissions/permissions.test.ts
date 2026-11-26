import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROLE_CODES,
  DEFAULT_ROLES,
  defaultPermissionsOf,
  definePermissions,
  getPermission,
  isPermissionCode,
  PERMISSION_CODES,
  PERMISSION_LIST,
  permissionCodeSchema,
  PERMISSIONS,
  roleLimitsSchema,
  withRequiredPermissions,
} from './index.js';

import type { PermissionCode, PermissionDefinition } from './index.js';

describe('definePermissions', () => {
  it('adds the code and the module to every declaration', () => {
    const declared = definePermissions('sales', {
      'order.create': { scope: 'branch', surfaces: ['pos'], defaultRoles: ['cashier'] },
    });
    expect(declared['order.create']).toEqual({
      code: 'order.create',
      module: 'sales',
      scope: 'branch',
      surfaces: ['pos'],
      defaultRoles: ['cashier'],
    });
  });
});

describe('permission catalog', () => {
  it('uses module.action codes in snake_case', () => {
    for (const code of PERMISSION_CODES) {
      expect(code).toMatch(/^[a-z][a-z_]*\.[a-z][a-z_]*$/);
    }
  });

  it('only requires permissions that exist, and never itself', () => {
    const definitions: Record<string, PermissionDefinition> = PERMISSIONS;
    for (const [code, definition] of Object.entries(definitions)) {
      for (const required of definition.requires ?? []) {
        expect(isPermissionCode(required), `${code} requires unknown ${required}`).toBe(true);
        expect(required).not.toBe(code);
      }
    }
  });

  it('never grants a business-wide permission to a branch-level default group by accident', () => {
    // Business permissions only work on an all-branches assignment (06 section 3.4).
    // Manager, cashier, staff, kitchen and stock keeper are assigned per branch.
    const perBranchRoles = ['manager', 'cashier', 'staff', 'kitchen', 'stock_keeper'];
    for (const permission of PERMISSION_LIST.filter((item) => item.scope === 'business')) {
      for (const role of permission.defaultRoles) {
        expect(perBranchRoles, `${permission.code} -> ${role}`).not.toContain(role);
      }
    }
  });

  it('resolves optional attributes to definite values', () => {
    expect(getPermission('branch.manage')).toMatchObject({
      scope: 'business',
      isSensitive: true,
      isApprovable: false,
      requires: ['branch.view'],
    });
    expect(getPermission('branch.view')).toMatchObject({ isSensitive: false, requires: [] });
  });

  it('validates codes at runtime', () => {
    expect(permissionCodeSchema.parse('user.manage')).toBe('user.manage');
    expect(permissionCodeSchema.safeParse('user.fly').success).toBe(false);
    expect(isPermissionCode('toString')).toBe(false);
  });

  it('rejects a misspelled code at compile time', () => {
    const valid: PermissionCode = 'role.assign';
    // @ts-expect-error -- 'role.asign' is not a declared permission code
    const invalid: PermissionCode = 'role.asign';
    expect([valid, invalid]).toHaveLength(2);
  });
});

describe('default groups', () => {
  it('has the seven groups, with only the owner locked', () => {
    expect(DEFAULT_ROLES.map((role) => role.code)).toEqual([...DEFAULT_ROLE_CODES]);
    expect(DEFAULT_ROLES.filter((role) => role.isLocked).map((role) => role.code)).toEqual([
      'owner',
    ]);
  });

  it('gives the owner everything and the others what the declarations say', () => {
    expect(defaultPermissionsOf('owner')).toEqual(PERMISSION_CODES);
    expect(defaultPermissionsOf('manager')).toEqual([
      'branch.view',
      'branch.settings',
      'user.view',
      'user.manage',
      'user.reset_credentials',
      'role.view',
      'role.assign',
      'device.manage',
      'audit.view',
    ]);
    expect(defaultPermissionsOf('accountant')).toEqual(['branch.view', 'user.view', 'audit.view']);
    expect(defaultPermissionsOf('cashier')).toEqual([]);
  });

  it('gives every default group the permissions its own permissions require', () => {
    for (const role of DEFAULT_ROLE_CODES) {
      const held = defaultPermissionsOf(role);
      expect(withRequiredPermissions(held), role).toEqual(held);
    }
  });

  it('sets the installation limits of cashier and manager', () => {
    const limitsOf = (code: string) => DEFAULT_ROLES.find((role) => role.code === code)?.limits;
    expect(limitsOf('cashier')).toEqual({
      maxDiscountPercent: 10,
      maxPayOutAmount: 200_000,
      maxRefundAmount: null,
    });
    expect(limitsOf('manager')).toEqual({
      maxDiscountPercent: 100,
      maxPayOutAmount: null,
      maxRefundAmount: null,
    });
    for (const role of DEFAULT_ROLES) {
      expect(roleLimitsSchema.safeParse(role.limits).success).toBe(true);
    }
  });
});

describe('withRequiredPermissions', () => {
  it('adds required permissions transitively and keeps declaration order', () => {
    expect(withRequiredPermissions(['role.assign'])).toEqual([
      'user.view',
      'role.view',
      'role.assign',
    ]);
    expect(withRequiredPermissions([])).toEqual([]);
  });
});
