import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IDS, makeCatalog, makeMe, makeMeBranch, makeRole } from '../../test/fixtures';
import { renderWithApp } from '../../test/render-app';
import { RoleEditorPage } from './role-editor-page';

import type { FakeRequest } from '../../test/render-app';
import type { Me, Role } from '@fnb/contract';

const CUSTOM: Role = makeRole({
  id: '01930000-0000-7000-8000-0000000000c1',
  code: null,
  name: { vi: 'Thu ngân ca tối' },
  isSystem: false,
  permissions: ['user.view'],
});

function api(me: Me, role: Role) {
  return (request: FakeRequest) => {
    if (request.path === '/auth/me') {
      return { status: 200, body: { data: me } };
    }
    if (request.path === '/permissions') {
      return { status: 200, body: { data: makeCatalog() } };
    }
    if (request.path === `/roles/${role.id}`) {
      return request.method === 'PATCH'
        ? { status: 200, body: { data: { ...role, ...(request.body as object) } } }
        : { status: 200, body: { data: role } };
    }
    return {
      status: 200,
      body: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
    };
  };
}

const owner = makeMe({
  hasAllBranches: true,
  branches: [
    {
      ...makeMeBranch({ id: IDS.branchQ1, code: 'Q1', name: 'Quận 1' }, [
        'branch.view',
        'user.view',
        'user.manage',
      ]),
      role: { id: '01930000-0000-7000-8000-0000000000ff', code: 'owner', name: { vi: 'Chủ' } },
      isAllBranches: true,
    },
  ],
  businessPermissions: ['branch.manage', 'role.manage'],
});

describe('RoleEditorPage', () => {
  it('saves names, permissions and limits in one PATCH', async () => {
    const { requests } = renderWithApp(
      <RoleEditorPage roleId={CUSTOM.id} onBack={vi.fn()} onSaved={vi.fn()} />,
      { handler: api(owner, CUSTOM), permissions: ['role.view', 'role.manage'] },
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: /Quản lý nhân viên/ }));
    await userEvent.type(screen.getByLabelText('Giảm giá tối đa (%)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nhóm quyền' }));
    await screen.findByText('Đã lưu nhóm Thu ngân ca tối. Có hiệu lực ngay.');
    const patch = requests.find((request) => request.method === 'PATCH');
    expect(patch?.body).toMatchObject({
      name: { vi: 'Thu ngân ca tối' },
      limits: { maxDiscountPercent: 5, maxPayOutAmount: null, maxRefundAmount: null },
    });
    expect([...((patch?.body as { permissions?: string[] }).permissions ?? [])].sort()).toEqual([
      'user.manage',
      'user.view',
    ]);
  });

  it('is read-only for a group the editor belongs to', async () => {
    const own = makeRole();
    const manager = makeMe({
      branches: [makeMeBranch({ id: IDS.branchQ1, code: 'Q1', name: 'Quận 1' }, ['role.view'])],
      businessPermissions: ['role.manage'],
    });
    renderWithApp(<RoleEditorPage roleId={own.id} onBack={vi.fn()} onSaved={vi.fn()} />, {
      handler: api(manager, own),
      permissions: ['role.view', 'role.manage'],
    });
    expect(await screen.findByText(/Bạn đang thuộc nhóm này/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lưu nhóm quyền' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: /Xem nhân viên/ }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
