import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeMe, makeUserWithAssignments } from '../../test/fixtures';
import { renderWithApp } from '../../test/render-app';
import { DEFAULT_STAFF_FILTERS, StaffListPage } from './staff-list-page';

import type { FakeRequest } from '../../test/render-app';

const LAN = makeUserWithAssignments();
const MINH = makeUserWithAssignments({
  id: '01930000-0000-7000-8000-000000000002',
  username: 'minh',
  fullName: 'Trần Minh',
  isLocked: true,
});

function api(request: FakeRequest) {
  if (request.path === '/auth/me') {
    return { status: 200, body: { data: makeMe() } };
  }
  if (request.path.startsWith('/users?')) {
    const isLockedCount =
      request.path.includes('status=locked') && request.path.includes('pageSize=1');
    const rows = isLockedCount ? [MINH] : [LAN, MINH];
    return {
      status: 200,
      body: {
        data: rows,
        meta: { page: 1, pageSize: isLockedCount ? 1 : 20, total: rows.length, totalPages: 1 },
      },
    };
  }
  if (request.path === `/users/${MINH.id}/unlock`) {
    return { status: 200, body: { data: { ...MINH, isLocked: false } } };
  }
  if (request.path === `/users/${MINH.id}/reset-pin`) {
    return { status: 200, body: { data: MINH } };
  }
  return { status: 404, body: { error: { code: 'NOT_FOUND', requestId: 'r' } } };
}

describe('StaffListPage', () => {
  it('lists staff with status, the locked banner and the page summary', async () => {
    renderWithApp(
      <StaffListPage
        filters={DEFAULT_STAFF_FILTERS}
        onFiltersChange={vi.fn()}
        onOpen={vi.fn()}
        onOpenRoles={vi.fn()}
      />,
      { handler: api, permissions: ['user.view', 'user.reset_credentials'] },
    );
    const table = await screen.findByRole('table', { name: 'Danh sách nhân viên' });
    expect(await within(table).findByText('Trần Minh')).toBeTruthy();
    expect(within(table).getByText('Bị khoá · sai PIN 5 lần')).toBeTruthy();
    expect(screen.getByText(/1 tài khoản đang bị khoá/)).toBeTruthy();
    expect(screen.getByText('Hiển thị 1–2 trên 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Thêm nhân viên' })).toBeNull();
  });

  it('sends the filters to the API', async () => {
    const { requests } = renderWithApp(
      <StaffListPage
        filters={{ ...DEFAULT_STAFF_FILTERS, search: 'lan', status: 'active', page: 2 }}
        onFiltersChange={vi.fn()}
        onOpen={vi.fn()}
        onOpenRoles={vi.fn()}
      />,
      { handler: api, permissions: ['user.view'] },
    );
    await screen.findByRole('table');
    expect(requests.map((request) => request.path)).toContain(
      '/users?page=2&pageSize=20&search=lan&status=active',
    );
  });

  it('unlocks, and resets a PIN to a temporary one shown once', async () => {
    const { requests } = renderWithApp(
      <StaffListPage
        filters={DEFAULT_STAFF_FILTERS}
        onFiltersChange={vi.fn()}
        onOpen={vi.fn()}
        onOpenRoles={vi.fn()}
      />,
      { handler: api, permissions: ['user.view', 'user.reset_credentials'] },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Mở khoá' }));
    expect(await screen.findByText('Đã mở khoá Trần Minh.')).toBeTruthy();

    const row = screen.getByRole('row', { name: /Trần Minh/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Đặt lại PIN' }));
    const confirm = await screen.findByRole('dialog', { name: 'Đặt lại PIN cho Trần Minh?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Đặt lại PIN' }));
    const shown = await screen.findByRole('dialog', { name: 'PIN tạm của Trần Minh' });
    const reset = requests.find((request) => request.path.endsWith('/reset-pin'));
    const pin = (reset?.body as { pin?: string } | undefined)?.pin ?? '';
    expect(pin).toMatch(/^\d{6}$/);
    expect(within(shown).getByText(pin)).toBeTruthy();
  });
});
