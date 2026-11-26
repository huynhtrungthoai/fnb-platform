import { describe, expect, it } from 'vitest';

import {
  branchReach,
  businessPermissions,
  hasPermissionAt,
  reachesAnyBranch,
  reachesBranch,
  resolveEffectiveAccess,
} from './access.js';

import type { RoleGrant, UserAccess } from './access.js';
import type { PermissionCode } from '@fnb/contract';

const grant = (code: string, permissions: PermissionCode[]): RoleGrant => ({
  roleId: `role-${code}`,
  roleCode: code,
  roleName: { vi: code },
  roleVersion: 1,
  permissions,
  limits: { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null },
});

const access = (
  allBranches: RoleGrant | null,
  branches: Record<string, RoleGrant> = {},
): UserAccess => ({
  userId: 'u1',
  allBranches,
  branches,
});

describe('resolveEffectiveAccess', () => {
  it('returns null where the user has no assignment', () => {
    expect(
      resolveEffectiveAccess(access(null, { b1: grant('manager', ['user.view']) }), 'b2'),
    ).toBeNull();
  });

  it('takes branch permissions from the winning grant and business permissions from all-branches only', () => {
    const user = access(grant('wide', ['branch.manage', 'audit.view']), {
      b1: grant('local', ['user.view', 'role.manage']),
    });
    // At b1 the local grant wins: its business permission does not count, the wide one does.
    expect(resolveEffectiveAccess(user, 'b1')).toMatchObject({
      roleCode: 'local',
      isAllBranches: false,
      permissions: ['user.view', 'branch.manage'],
    });
    expect(resolveEffectiveAccess(user, 'b2')).toMatchObject({
      roleCode: 'wide',
      isAllBranches: true,
      permissions: ['audit.view', 'branch.manage'],
    });
    expect(businessPermissions(user)).toEqual(['branch.manage']);
  });
});

describe('hasPermissionAt', () => {
  it('needs a branch for branch permissions and none for business permissions', () => {
    const user = access(grant('wide', ['branch.manage', 'user.view']));
    expect(hasPermissionAt(user, 'user.view', undefined)).toBe(false);
    expect(hasPermissionAt(user, 'user.view', 'b1')).toBe(true);
    expect(hasPermissionAt(user, 'branch.manage', undefined)).toBe(true);
    expect(
      hasPermissionAt(access(null, { b1: grant('x', ['branch.manage']) }), 'branch.manage', 'b1'),
    ).toBe(false);
  });
});

describe('branchReach', () => {
  it('lists the branches where the permission is held', () => {
    const local = access(null, { b1: grant('a', ['user.view']), b2: grant('b', []) });
    expect(branchReach(local, 'user.view')).toEqual({
      isAll: false,
      branchIds: ['b1'],
      exceptBranchIds: [],
    });
    expect(reachesAnyBranch(branchReach(local, 'audit.view'))).toBe(false);
  });

  it('excludes a branch whose own assignment lacks the permission', () => {
    const user = access(grant('wide', ['user.view']), { b1: grant('cashier', []) });
    const reach = branchReach(user, 'user.view');
    expect(reach).toEqual({ isAll: true, branchIds: [], exceptBranchIds: ['b1'] });
    expect(reachesBranch(reach, 'b1')).toBe(false);
    expect(reachesBranch(reach, 'b9')).toBe(true);
  });
});
