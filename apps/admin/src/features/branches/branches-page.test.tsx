import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IDS, makeMe, makeMeBranch } from '../../test/fixtures';
import { errorBody, renderWithApp } from '../../test/render-app';
import { BranchesPage } from './branches-page';

import type { FakeRequest } from '../../test/render-app';
import type { Branch, BranchSettings, Me, PermissionCode } from '@fnb/contract';

const Q1: Branch = {
  id: IDS.branchQ1,
  code: 'Q1',
  name: 'Chi nhánh Quận 1',
  address: '12 Lê Lợi',
  phone: null,
  latitude: null,
  longitude: null,
  isActive: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const Q3: Branch = {
  ...Q1,
  id: IDS.branchQ3,
  code: 'Q3',
  name: 'Chi nhánh Quận 3',
  isActive: false,
};

function settingsOf(branchId: string): BranchSettings {
  return {
    branchId,
    timezone: 'Asia/Ho_Chi_Minh',
    openTime: '10:00',
    closeTime: '22:00',
    dayCutoffTime: '00:00',
    taxRatePercent: 0,
    serviceChargePercent: 0,
    receipt: { businessName: null, address: null, phone: null, taxCode: null, footer: null },
    bankAccount: null,
    pendingDayCutoffTime: null,
    pendingDayCutoffFrom: null,
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

function meWith(permissions: PermissionCode[], business: PermissionCode[] = []): Me {
  return makeMe({
    branches: [makeMeBranch({ id: IDS.branchQ1, code: 'Q1', name: Q1.name }, permissions)],
    businessPermissions: business,
  });
}

function api(me: Me) {
  return (request: FakeRequest) => {
    const { method, path } = request;
    if (path === '/auth/me') {
      return { status: 200, body: { data: me } };
    }
    if (method === 'GET' && path === '/branches?status=all') {
      return { status: 200, body: { data: [Q1, Q3] } };
    }
    const settings = /^\/branches\/([^/]+)\/settings$/.exec(path);
    if (settings) {
      const id = settings[1] ?? '';
      return method === 'GET'
        ? { status: 200, body: { data: settingsOf(id) } }
        : { status: 200, body: { data: { ...settingsOf(id), ...(request.body as object) } } };
    }
    const one = /^\/branches\/([^/]+)$/.exec(path);
    if (one) {
      const branch = one[1] === Q3.id ? Q3 : Q1;
      if (method === 'PATCH') {
        return request.body && (request.body as { code?: string }).code === 'Q3'
          ? { status: 409, body: errorBody('BRANCH_CODE_TAKEN') }
          : { status: 200, body: { data: { ...branch, ...(request.body as object) } } };
      }
      return { status: 200, body: { data: branch } };
    }
    return { status: 404, body: errorBody('NOT_FOUND') };
  };
}

describe('BranchesPage', () => {
  it('lists branches with their status and opens the first one', async () => {
    renderWithApp(<BranchesPage selectedId={undefined} onSelect={vi.fn()} />, {
      handler: api(meWith(['branch.view', 'branch.settings'], ['branch.manage'])),
      permissions: ['branch.view', 'branch.settings', 'branch.manage'],
    });
    const list = await screen.findByRole('list', { name: 'Danh sách chi nhánh' });
    expect(within(list).getByText('Chi nhánh Quận 3')).toBeTruthy();
    expect(within(list).getByText('Ngừng hoạt động')).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi nhánh Quận 1' })).toBeTruthy();
    expect(
      screen.getByText('1 chi nhánh đang hoạt động · cấu hình riêng từng chi nhánh'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thêm chi nhánh' })).toBeTruthy();
  });

  it('sends only the changed part to its endpoint and shows API errors translated', async () => {
    const { requests } = renderWithApp(<BranchesPage selectedId={Q1.id} onSelect={vi.fn()} />, {
      handler: api(meWith(['branch.view', 'branch.settings'], ['branch.manage'])),
      permissions: ['branch.view', 'branch.settings', 'branch.manage'],
    });
    const phone = await screen.findByLabelText('Số điện thoại');
    await userEvent.type(phone, '028 3822 1234');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText('Đã lưu thay đổi của Chi nhánh Quận 1.');
    const writes = requests.filter((request) => request.method !== 'GET');
    expect(writes.map((request) => `${request.method} ${request.path}`)).toEqual([
      `PATCH /branches/${Q1.id}`,
    ]);
    expect(writes[0]?.body).toMatchObject({ phone: '028 3822 1234', code: 'Q1' });

    const code = screen.getByLabelText('Mã chi nhánh');
    await userEvent.clear(code);
    await userEvent.type(code, 'q3');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Mã chi nhánh này đã được dùng/)).toBeTruthy();
  });

  it('is read-only without the edit permissions', async () => {
    renderWithApp(<BranchesPage selectedId={Q1.id} onSelect={vi.fn()} />, {
      handler: api(meWith(['branch.view'])),
      permissions: ['branch.view'],
    });
    const name = await screen.findByLabelText<HTMLInputElement>('Tên chi nhánh');
    expect(name.disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>('Giờ mở cửa').disabled).toBe(true);
    expect(screen.getByText('Bạn chỉ có quyền xem phần này.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ngừng hoạt động' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Thêm chi nhánh' })).toBeNull();
  });

  it('asks before deactivating, then calls the endpoint', async () => {
    const { requests } = renderWithApp(<BranchesPage selectedId={Q1.id} onSelect={vi.fn()} />, {
      handler: (request) =>
        request.path.endsWith('/deactivate')
          ? { status: 200, body: { data: { ...Q1, isActive: false } } }
          : api(meWith(['branch.view'], ['branch.manage']))(request),
      permissions: ['branch.view', 'branch.manage'],
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Ngừng hoạt động' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ngừng hoạt động Chi nhánh Quận 1?')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ngừng hoạt động' }));
    await screen.findByText('Chi nhánh Quận 1 đã ngừng hoạt động.');
    expect(requests.some((request) => request.path === `/branches/${Q1.id}/deactivate`)).toBe(true);
  });
});
