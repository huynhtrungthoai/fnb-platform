import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IDS, makeMe } from '../../test/fixtures';
import { renderWithApp } from '../../test/render-app';
import { DevicesPage } from './devices-page';

import type { FakeRequest } from '../../test/render-app';
import type { Device } from '@fnb/contract';

const POS: Device = {
  id: '01930000-0000-7000-8000-000000000d01',
  branch: { id: IDS.branchQ1, code: 'Q1', name: 'Quận 1', isActive: true },
  code: 'Q1-P01',
  name: 'POS quầy 1',
  kind: 'pos',
  isActive: true,
  revokedAt: null,
  lastSeenAt: null,
  appVersion: '0.1.0',
  lastUser: null,
  createdAt: '2026-11-27T00:00:00.000Z',
};

function api(request: FakeRequest) {
  if (request.path === '/auth/me') {
    return { status: 200, body: { data: makeMe() } };
  }
  if (request.path.startsWith('/devices?')) {
    return { status: 200, body: { data: [POS] } };
  }
  if (request.path === `/devices/${POS.id}/revoke`) {
    return { status: 200, body: { data: { ...POS, isActive: false } } };
  }
  return { status: 404 };
}

describe('DevicesPage', () => {
  it('lists devices and revokes one after a danger confirmation', async () => {
    const { requests } = renderWithApp(<DevicesPage />, {
      handler: api,
      permissions: ['device.manage'],
    });
    const row = await screen.findByRole('row', { name: /POS quầy 1/ });
    expect(within(row).getByText('Q1-P01')).toBeTruthy();
    expect(requests.some((request) => request.path === '/devices?status=active')).toBe(true);

    await userEvent.click(within(row).getByRole('button', { name: 'Thu hồi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thu hồi POS quầy 1?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thu hồi' }));
    expect(await screen.findByText('Đã thu hồi POS quầy 1.')).toBeTruthy();
  });

  it('explains that registration happens on the device itself', async () => {
    renderWithApp(<DevicesPage />, { handler: api, permissions: ['device.manage'] });
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký thiết bị' }));
    expect(await screen.findByRole('dialog', { name: 'Đăng ký thiết bị' })).toBeTruthy();
  });
});
