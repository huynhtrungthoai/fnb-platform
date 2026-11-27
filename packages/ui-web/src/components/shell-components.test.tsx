import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from '../test/render';
import { AppShell } from './app-shell';
import { Button } from './button';
import { FormActions, FormSection } from './form-section';
import { Menu } from './menu';
import { NoPermission } from './no-permission';
import { PageHeader } from './page-header';
import { Can, PermissionProvider, usePermission } from './permissions';
import { Select } from './select';
import { Sidebar } from './sidebar';

import type { NavGroup } from './sidebar';

const GROUPS: NavGroup[] = [
  { key: 'main', items: [{ key: 'home', label: 'Tổng quan', icon: 'home', href: '/' }] },
  {
    key: 'system',
    label: 'Hệ thống',
    items: [
      {
        key: 'branches',
        label: 'Chi nhánh',
        icon: 'store',
        href: '/branches',
        permission: 'branch.view',
      },
    ],
  },
  {
    key: 'people',
    label: 'Nhân sự',
    items: [
      { key: 'staff', label: 'Nhân viên', icon: 'users', href: '/staff', permission: 'user.view' },
    ],
  },
];

describe('Can and usePermission', () => {
  function Probe() {
    return <span>{usePermission('user.manage') ? 'yes' : 'no'}</span>;
  }

  it('shows children only with the permission, the fallback otherwise', () => {
    renderWithI18n(
      <PermissionProvider permissions={['user.view']}>
        <Can permission="user.view">
          <span>visible</span>
        </Can>
        <Can permission="user.manage" fallback={<span>fallback</span>}>
          <span>hidden</span>
        </Can>
        <Probe />
      </PermissionProvider>,
    );
    expect(screen.getByText('visible')).toBeTruthy();
    expect(screen.getByText('fallback')).toBeTruthy();
    expect(screen.queryByText('hidden')).toBeNull();
    expect(screen.getByText('no')).toBeTruthy();
  });

  it('grants nothing outside a provider', () => {
    renderWithI18n(
      <Can permission="branch.view">
        <span>visible</span>
      </Can>,
    );
    expect(screen.queryByText('visible')).toBeNull();
  });
});

describe('Sidebar', () => {
  it('lists only the links the caller may open and hides empty groups', () => {
    renderWithI18n(
      <PermissionProvider permissions={['branch.view']}>
        <Sidebar label="Menu chính" groups={GROUPS} activeKey="branches" />
      </PermissionProvider>,
    );
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chi nhánh' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.queryByText('Nhân sự')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Nhân viên' })).toBeNull();
  });

  it('navigates inside the app on a plain click', async () => {
    const handleNavigate = vi.fn();
    renderWithI18n(
      <PermissionProvider permissions={['branch.view']}>
        <Sidebar label="Menu chính" groups={GROUPS} onNavigate={handleNavigate} />
      </PermissionProvider>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Chi nhánh' }));
    expect(handleNavigate).toHaveBeenCalledWith('/branches');
  });
});

describe('AppShell', () => {
  it('opens the menu drawer from the top bar and closes it on a link', async () => {
    renderWithI18n(
      <AppShell sidebar={<a href="/x">Mục</a>} topbar={<span>Thanh trên</span>}>
        <p>Nội dung</p>
      </AppShell>,
    );
    expect(screen.getByText('Nội dung')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Mục' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const links = screen.getAllByRole('link', { name: 'Mục' });
    expect(links).toHaveLength(2);
    const drawerLink = links[1];
    if (!drawerLink) {
      throw new Error('drawer link missing');
    }
    drawerLink.addEventListener('click', (event) => {
      event.preventDefault();
    });
    await userEvent.click(drawerLink);
    expect(screen.getAllByRole('link', { name: 'Mục' })).toHaveLength(1);
  });
});

describe('PageHeader', () => {
  it('shows title, description, breadcrumb and actions', async () => {
    const handleBack = vi.fn();
    renderWithI18n(
      <PageHeader
        title="Chi nhánh"
        description="3 chi nhánh"
        breadcrumb={[{ label: 'Hệ thống', onSelect: handleBack }, { label: 'Chi nhánh' }]}
        actions={<Button variant="primary">Thêm</Button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Chi nhánh' })).toBeTruthy();
    expect(screen.getByText('3 chi nhánh')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Hệ thống' }));
    expect(handleBack).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeTruthy();
  });
});

describe('NoPermission', () => {
  it('names the missing permission in the current language', () => {
    renderWithI18n(<NoPermission permission="branch.view" />, 'en');
    expect(screen.getByText("You don't have access to this")).toBeTruthy();
    expect(screen.getByText(/"View branches"/)).toBeTruthy();
  });
});

describe('Select', () => {
  it('shows the chosen option and reports a new choice', async () => {
    const handleChange = vi.fn();
    renderWithI18n(
      <Select
        label="Chi nhánh"
        options={[
          { value: 'q1', label: 'Quận 1' },
          { value: 'q3', label: 'Quận 3', description: 'Q3' },
        ]}
        value="q1"
        onChange={handleChange}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Chi nhánh' });
    expect(trigger.textContent).toContain('Quận 1');
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: /Quận 3/ }));
    expect(handleChange).toHaveBeenCalledWith('q3');
  });
});

describe('Menu', () => {
  it('runs the selected action', async () => {
    const handleLogout = vi.fn();
    renderWithI18n(
      <Menu
        trigger={<button type="button">Tài khoản</button>}
        items={[{ key: 'logout', label: 'Đăng xuất', icon: 'log-out', onSelect: handleLogout }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tài khoản' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));
    expect(handleLogout).toHaveBeenCalled();
  });
});

describe('FormSection and FormActions', () => {
  it('groups fields under a legend and lays out the actions', () => {
    renderWithI18n(
      <form>
        <FormSection title="Thông tin" description="Tên và mã">
          <input aria-label="Tên" />
        </FormSection>
        <FormActions
          primary={<Button variant="primary">Lưu</Button>}
          secondary={<Button>Huỷ</Button>}
        />
      </form>,
    );
    expect(screen.getByRole('group', { name: 'Thông tin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeTruthy();
  });
});
