import type { Me, MeBranch, PermissionCode } from '@fnb/contract';

/** What the signed-in user may do in the branch they work in now. */
export interface WorkingAccess {
  /** The branch in use; null when the user is assigned nowhere. */
  current: MeBranch | null;
  /** Branches the user can switch to, active ones first. */
  branches: readonly MeBranch[];
  /** Permissions at `current` plus the business-wide ones (06 section 7.2). */
  permissions: readonly PermissionCode[];
}

/**
 * Picks the working branch: the stored choice when the user is still assigned there, otherwise
 * the first active branch, otherwise the first one.
 */
export function resolveWorkingAccess(
  me: Me | null | undefined,
  storedId: string | null,
): WorkingAccess {
  const branches = [...(me?.branches ?? [])].sort(
    (a, b) => Number(b.branch.isActive) - Number(a.branch.isActive),
  );
  const current =
    branches.find((entry) => entry.branch.id === storedId) ??
    branches.find((entry) => entry.branch.isActive) ??
    branches[0] ??
    null;
  const permissions = [
    ...new Set([...(current?.permissions ?? []), ...(me?.businessPermissions ?? [])]),
  ];
  return { current, branches, permissions };
}

/**
 * Permissions at one particular branch (not the working one), for screens that act on another
 * branch by id, such as the branch settings: that branch's grant plus the business-wide ones.
 */
export function permissionsAt(
  me: Me | null | undefined,
  branchId: string | null,
): ReadonlySet<PermissionCode> {
  const entry = (me?.branches ?? []).find((candidate) => candidate.branch.id === branchId);
  return new Set([...(entry?.permissions ?? []), ...(me?.businessPermissions ?? [])]);
}
