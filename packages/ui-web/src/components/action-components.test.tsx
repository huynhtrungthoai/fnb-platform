import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from '../test/render';
import { Badge } from './badge';
import { Card } from './card';
import { ConfirmDialog } from './confirm-dialog';
import { DangerButton } from './danger-button';
import { IconButton } from './icon-button';
import { Tabs } from './tabs';

describe('Badge and Card padding', () => {
  it('renders the label with its icon and lets a card run to the edges', () => {
    renderWithI18n(
      <Card padding="none" title="Danh sách">
        <Badge tone="success" icon="check">
          Đang hoạt động
        </Badge>
      </Card>,
    );
    expect(screen.getByText('Đang hoạt động').querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Danh sách' })).toBeTruthy();
  });
});

describe('Tabs', () => {
  function Sample() {
    const [value, setValue] = useState('a');
    return (
      <Tabs
        label="Cấu hình"
        value={value}
        onChange={setValue}
        items={[
          { value: 'a', label: 'Thông tin', content: <p>Nội dung A</p> },
          { value: 'b', label: 'Bill', content: <p>Nội dung B</p> },
        ]}
      />
    );
  }

  it('shows one panel at a time', async () => {
    renderWithI18n(<Sample />);
    expect(screen.getByText('Nội dung A')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Bill' }));
    expect(screen.getByText('Nội dung B')).toBeTruthy();
    expect(screen.queryByText('Nội dung A')).toBeNull();
  });
});

describe('DangerButton and IconButton', () => {
  it('blocks a second click while loading and names icon-only buttons', async () => {
    const handleClick = vi.fn();
    renderWithI18n(
      <>
        <DangerButton icon="ban" loading onClick={handleClick}>
          Ngừng
        </DangerButton>
        <IconButton icon="edit" label="Sửa" onClick={handleClick} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Ngừng/ }));
    expect(handleClick).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog', () => {
  it('runs the action only after confirming, with the reason when one is required', async () => {
    const handleConfirm = vi.fn();
    renderWithI18n(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        tone="danger"
        title="Xoá nhóm?"
        confirmLabel="Xoá"
        reasonRequired
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Xoá nhóm?' });
    const confirm = within(dialog).getByRole('button', { name: 'Xoá' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await userEvent.type(within(dialog).getByLabelText('Lý do'), ' Trùng nhóm ');
    await userEvent.click(confirm);
    expect(handleConfirm).toHaveBeenCalledWith('Trùng nhóm');
  });

  it('cancels without running the action', async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    renderWithI18n(
      <ConfirmDialog
        open
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Lưu?"
        confirmLabel="Lưu"
      />,
      'en',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalled();
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});
