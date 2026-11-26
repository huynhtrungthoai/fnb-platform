import { getPermission, isPermissionCode } from '@fnb/contract';

import type { LocalizedText, PermissionCode, RoleLimits } from '@fnb/contract';

/** A permission group as held by one user: what the group allows and its limits. */
export interface RoleGrant {
  roleId: string;
  /** Code of a default group, null for a custom one. Never used for permission checks. */
  roleCode: string | null;
  roleName: LocalizedText;
  roleVersion: number;
  /** The locked owner group. Used to protect owner accounts, never to grant anything. */
  isLocked: boolean;
  permissions: PermissionCode[];
  limits: RoleLimits;
}

/** Every assignment of one user. This is what the permission cache stores. */
export interface UserAccess {
  userId: string;
  /** The all-branches assignment, when the user has one. */
  allBranches: RoleGrant | null;
  /** Assignments to specific branches, by branch id. */
  branches: Record<string, RoleGrant>;
}

/** What a user may do at one branch. */
export interface EffectiveAccess {
  branchId: string;
  roleId: string;
  roleCode: string | null;
  roleName: LocalizedText;
  roleVersion: number;
  /** True when the grant comes from the all-branches assignment. */
  isAllBranches: boolean;
  permissions: PermissionCode[];
  limits: RoleLimits;
}

const isBusinessScope = (code: PermissionCode): boolean => getPermission(code).scope === 'business';

/** Business-wide permissions: they only ever come from the all-branches assignment (06 section 3.4). */
export function businessPermissions(access: UserAccess): PermissionCode[] {
  return (access.allBranches?.permissions ?? []).filter(isBusinessScope);
}

/**
 * Effective access at one branch (06 section 3.3):
 *  - a branch-specific assignment wins over the all-branches one; the two are never added up
 *  - business-wide permissions come from the all-branches assignment only
 * Returns null when the user is not assigned at the branch at all.
 */
export function resolveEffectiveAccess(
  access: UserAccess,
  branchId: string,
): EffectiveAccess | null {
  const specific = access.branches[branchId];
  const grant = specific ?? access.allBranches;
  if (!grant) {
    return null;
  }
  const branchScoped = grant.permissions.filter((code) => !isBusinessScope(code));
  return {
    branchId,
    roleId: grant.roleId,
    roleCode: grant.roleCode,
    roleName: grant.roleName,
    roleVersion: grant.roleVersion,
    isAllBranches: !specific,
    permissions: [...branchScoped, ...businessPermissions(access)],
    limits: grant.limits,
  };
}

/** True when the user holds the permission at the branch (or business-wide for a business permission). */
export function hasPermissionAt(
  access: UserAccess,
  code: PermissionCode,
  branchId: string | undefined,
): boolean {
  if (isBusinessScope(code)) {
    return businessPermissions(access).includes(code);
  }
  if (!branchId) {
    return false;
  }
  return resolveEffectiveAccess(access, branchId)?.permissions.includes(code) ?? false;
}

/** The branches where a user holds one permission. */
export interface BranchReach {
  /** Held through the all-branches assignment: every branch except `exceptBranchIds`. */
  isAll: boolean;
  /** Branches with their own assignment that grants the permission. */
  branchIds: string[];
  /** Branches whose own assignment does not grant it; the specific assignment wins there. */
  exceptBranchIds: string[];
}

/** Works out at which branches the user holds the permission. Used to filter list endpoints. */
export function branchReach(access: UserAccess, code: PermissionCode): BranchReach {
  if (isBusinessScope(code)) {
    return {
      isAll: businessPermissions(access).includes(code),
      branchIds: [],
      exceptBranchIds: [],
    };
  }
  const specific = Object.entries(access.branches);
  const granted = specific
    .filter(([, grant]) => grant.permissions.includes(code))
    .map(([id]) => id);
  const denied = specific
    .filter(([, grant]) => !grant.permissions.includes(code))
    .map(([id]) => id);
  const isAll = access.allBranches?.permissions.includes(code) ?? false;
  return { isAll, branchIds: granted, exceptBranchIds: isAll ? denied : [] };
}

/** True when the reach covers at least one branch. */
export const reachesAnyBranch = (reach: BranchReach): boolean =>
  reach.isAll || reach.branchIds.length > 0;

/** True when the reach covers the branch. */
export const reachesBranch = (reach: BranchReach, branchId: string): boolean =>
  reach.branchIds.includes(branchId) || (reach.isAll && !reach.exceptBranchIds.includes(branchId));

/** Keeps only live, declared permission codes of a stored list. */
export function toPermissionCodes(codes: readonly string[]): PermissionCode[] {
  return codes.filter(isPermissionCode);
}

/**
 * Permissions a caller could hand out through an assignment at a branch (`null`: the
 * all-branches assignment). A branch assignment never carries business permissions.
 */
export function grantablePermissions(
  access: UserAccess,
  branchId: string | null,
): PermissionCode[] {
  if (branchId === null) {
    return access.allBranches?.permissions ?? [];
  }
  return resolveEffectiveAccess(access, branchId)?.permissions ?? [];
}

/** Permissions of a grant that take effect on an assignment at a branch (`null`: all branches). */
export function effectivePermissionsOfGrant(
  permissions: readonly PermissionCode[],
  branchId: string | null,
): PermissionCode[] {
  return branchId === null
    ? [...permissions]
    : permissions.filter((code) => !isBusinessScope(code));
}

/** Permissions in `wanted` that `held` does not contain. Empty when nothing would be escalated. */
export function missingPermissions(
  held: readonly PermissionCode[],
  wanted: readonly PermissionCode[],
): PermissionCode[] {
  const heldSet = new Set(held);
  return wanted.filter((code) => !heldSet.has(code));
}

/** True when the user holds the locked owner group on an all-branches assignment. */
export const isOwnerAccess = (access: UserAccess): boolean => access.allBranches?.isLocked ?? false;
