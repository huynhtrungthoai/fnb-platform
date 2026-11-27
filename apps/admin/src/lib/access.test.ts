import { describe, expect, it } from 'vitest';

import { IDS, makeMe, makeMeBranch } from '../test/fixtures';
import { resolveWorkingAccess } from './access';

const q1 = makeMeBranch({ id: IDS.branchQ1, code: 'Q1', name: 'Quận 1' }, ['branch.view']);
const q3 = makeMeBranch({ id: IDS.branchQ3, code: 'Q3', name: 'Quận 3' }, ['user.view']);

describe('resolveWorkingAccess', () => {
  it('keeps the stored branch while the user is assigned there', () => {
    const access = resolveWorkingAccess(makeMe({ branches: [q1, q3] }), IDS.branchQ3);
    expect(access.current?.branch.id).toBe(IDS.branchQ3);
    expect(access.permissions).toEqual(['user.view']);
  });

  it('falls back to the first active branch when the stored one is gone', () => {
    const inactive = { ...q1, branch: { ...q1.branch, isActive: false } };
    const access = resolveWorkingAccess(makeMe({ branches: [inactive, q3] }), 'missing');
    expect(access.current?.branch.id).toBe(IDS.branchQ3);
    expect(access.branches.map((entry) => entry.branch.id)).toEqual([IDS.branchQ3, IDS.branchQ1]);
  });

  it('adds business-wide permissions to those of the branch', () => {
    const access = resolveWorkingAccess(
      makeMe({ branches: [q1], businessPermissions: ['branch.manage', 'branch.view'] }),
      null,
    );
    expect([...access.permissions].sort()).toEqual(['branch.manage', 'branch.view']);
  });

  it('grants nothing when signed out or assigned nowhere', () => {
    expect(resolveWorkingAccess(null, null)).toEqual({
      current: null,
      branches: [],
      permissions: [],
    });
    expect(resolveWorkingAccess(makeMe({ branches: [] }), IDS.branchQ1).current).toBeNull();
  });
});
