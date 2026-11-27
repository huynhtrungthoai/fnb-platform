import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { makeCatalog } from '../test/fixtures';
import { renderWithApp } from '../test/render-app';
import { PermissionMatrix } from './permission-matrix';

import type { PermissionCode } from '@fnb/contract';

function Sample({ held }: { held: PermissionCode[] }) {
  const [value, setValue] = useState<PermissionCode[]>([]);
  return (
    <>
      <PermissionMatrix
        catalog={makeCatalog()}
        value={value}
        onChange={setValue}
        canChange={(code) => held.includes(code)}
        isNew={(code) => code === 'audit.view'}
      />
      <output>{[...value].sort().join(',')}</output>
    </>
  );
}

describe('PermissionMatrix', () => {
  it('ticks the permissions a ticked one requires', async () => {
    renderWithApp(<Sample held={['user.view', 'user.manage']} />, {
      handler: () => ({ status: 404 }),
    });
    await userEvent.click(screen.getByRole('checkbox', { name: /Quản lý nhân viên/ }));
    expect(screen.getByText('user.manage,user.view')).toBeTruthy();
  });

  it('locks permissions the editor does not hold', () => {
    renderWithApp(<Sample held={['user.view']} />, { handler: () => ({ status: 404 }) });
    expect(
      screen.getByRole('checkbox', { name: /Quản lý chi nhánh/ }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('checkbox', { name: /Xem nhân viên/ }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('filters by search and by the new label', async () => {
    renderWithApp(<Sample held={[]} />, { handler: () => ({ status: 404 }) });
    await userEvent.click(screen.getByRole('radio', { name: 'Mới · 1' }));
    expect(screen.getByRole('checkbox', { name: /Xem nhật ký/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Xem nhân viên/ })).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Tất cả' }));
    await userEvent.type(screen.getByRole('searchbox'), 'branch.manage');
    expect(screen.getByRole('checkbox', { name: /Quản lý chi nhánh/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Xem nhật ký/ })).toBeNull();
  });
});
