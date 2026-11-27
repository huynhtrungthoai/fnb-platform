import type {
  Me,
  MeBranch,
  PermissionCode,
  PermissionInfo,
  Role,
  User,
  UserWithAssignments,
} from '@fnb/contract';

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

/** A staff member with assignments, as `GET /users` returns. */
export function makeUserWithAssignments(
  values: Partial<UserWithAssignments> = {},
): UserWithAssignments {
  return { ...makeUser(), assignments: [], ...values };
}

/** A permission group. */
export function makeRole(values: Partial<Role> = {}): Role {
  return {
    id: IDS.roleManager,
    code: 'manager',
    name: { vi: 'Quản lý chi nhánh', en: 'Branch manager' },
    description: null,
    isSystem: true,
    isLocked: false,
    permissions: ['branch.view', 'user.view'],
    limits: { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null },
    version: 1,
    memberCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
    ...values,
  };
}

/** The foundation permission catalog, as `GET /permissions` returns. */
export function makeCatalog(): PermissionInfo[] {
  const at = '2026-11-01T00:00:00.000Z';
  const info = (code: PermissionCode, values: Partial<PermissionInfo> = {}): PermissionInfo => ({
    code,
    module: 'foundation',
    scope: 'branch',
    isSensitive: false,
    isApprovable: false,
    requires: [],
    addedAt: at,
    ...values,
  });
  return [
    info('branch.view'),
    info('branch.manage', { scope: 'business', isSensitive: true, requires: ['branch.view'] }),
    info('user.view'),
    info('user.manage', { isSensitive: true, requires: ['user.view'] }),
    info('audit.view', { addedAt: '2026-11-25T00:00:00.000Z' }),
  ];
}
