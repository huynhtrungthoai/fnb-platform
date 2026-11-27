import type { Me, MeBranch, PermissionCode, User } from '@fnb/contract';

/** Ids used across admin tests. */
export const IDS = {
  user: '01930000-0000-7000-8000-000000000001',
  branchQ1: 'b0000000-0000-7000-8000-000000000001',
  branchQ3: 'b0000000-0000-7000-8000-000000000003',
  roleManager: '01930000-0000-7000-8000-0000000000a1',
} as const;

/** A staff account with sensible defaults. */
export function makeUser(values: Partial<User> = {}): User {
  return {
    id: IDS.user,
    username: 'lan',
    fullName: 'Nguyễn Lan',
    phone: null,
    avatarMediaId: null,
    credentialType: 'pin',
    isActive: true,
    isLocked: false,
    lockedUntil: null,
    mustChangePin: false,
    lastLoginAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...values,
  };
}

/** One branch of `me`, holding these permissions. */
export function makeMeBranch(
  branch: { id: string; code: string; name: string; isActive?: boolean },
  permissions: PermissionCode[],
): MeBranch {
  return {
    branch: { isActive: true, ...branch },
    role: { id: IDS.roleManager, code: 'manager', name: { vi: 'Quản lý', en: 'Manager' } },
    isAllBranches: false,
    permissions,
    limits: { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null },
  };
}

/** Response of `GET /auth/me`. */
export function makeMe(values: Partial<Me> = {}): Me {
  return {
    user: makeUser(),
    hasAllBranches: false,
    branches: [makeMeBranch({ id: IDS.branchQ1, code: 'Q1', name: 'Quận 1' }, ['branch.view'])],
    businessPermissions: [],
    permissionsVersion: 'v1',
    ...values,
  };
}
