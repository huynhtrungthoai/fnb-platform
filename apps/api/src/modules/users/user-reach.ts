import { reachesBranch } from '../rbac/access.js';

import type { BranchReach } from '../rbac/access.js';
import type { AssignmentWithUserRow } from '../rbac/rbac.repository.js';

/**
 * True when a caller whose `user.view` reaches `reach` may see a user with these assignments
 * ("staff only see the data of their branches", plans/10-foundation.md):
 *  - a user assigned at a branch the caller reaches
 *  - for an all-branches caller: also users with an all-branches assignment or none at all
 * A branch manager therefore never sees the owner or the staff of other branches.
 */
export function isUserVisible(
  reach: BranchReach,
  assignments: readonly AssignmentWithUserRow[],
): boolean {
  const atReachedBranch = assignments.some(
    (row) => row.branchId !== null && reachesBranch(reach, row.branchId),
  );
  if (atReachedBranch) {
    return true;
  }
  if (!reach.isAll) {
    return false;
  }
  return assignments.length === 0 || assignments.some((row) => row.branchId === null);
}

/** The assignments of a visible user that the caller may see: its reached branches and the all-branches one. */
export function visibleAssignments(
  reach: BranchReach,
  assignments: readonly AssignmentWithUserRow[],
): AssignmentWithUserRow[] {
  return assignments.filter((row) => row.branchId === null || reachesBranch(reach, row.branchId));
}

/** Groups assignment rows by user id. */
export function groupByUser(
  rows: readonly AssignmentWithUserRow[],
): Map<string, AssignmentWithUserRow[]> {
  const byUser = new Map<string, AssignmentWithUserRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  return byUser;
}

/** List filters on assignments: at a branch (directly or through all branches) and with a group. */
export function matchesAssignmentFilter(
  assignments: readonly AssignmentWithUserRow[],
  filter: { branchId?: string; roleId?: string },
): boolean {
  if (
    filter.branchId &&
    !assignments.some((row) => row.branchId === filter.branchId || row.branchId === null)
  ) {
    return false;
  }
  if (filter.roleId && !assignments.some((row) => row.roleId === filter.roleId)) {
    return false;
  }
  return true;
}
