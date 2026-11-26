import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from '../test/render';
import { Button } from './button';
import { Card } from './card';
import { Dialog } from './dialog';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Icon } from './icon';
import { Input } from './input';
import { LanguageSwitcher } from './language-switcher';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
import { ThemeProvider, useThemeMode } from './theme-provider';
import { ThemeSwitcher } from './theme-switcher';
import { dismissToast, toast, Toaster } from './toast';

describe('Button', () => {
  it('calls onClick and is a plain button by default', async () => {
    const handleClick = vi.fn();
    renderWithI18n(<Button onClick={handleClick}>Lưu</Button>);
    const button = screen.getByRole('button', { name: 'Lưu' });
    expect(button.getAttribute('type')).toBe('button');
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('blocks a second click and reports progress while loading', async () => {
    const handleClick = vi.fn();
    renderWithI18n(
      <Button variant="primary" loading onClick={handleClick}>
        Lưu
      </Button>,
    );
    const button = screen.getByRole('button', { name: /Lưu/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Đang tải');
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('uses the theme size unless a size is given', () => {
    renderWithI18n(
      <>
        <Button>Theme</Button>
        <Button size="sm">Small</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Theme' }).className).toContain('h-control ');
    expect(screen.getByRole('button', { name: 'Small' }).className).toContain('h-control-sm');
  });
});

describe('Input', () => {
  function Field({ error }: { error?: string }) {
    const [value, setValue] = useState('');
    return (
      <Input
        label="Tên món"
        value={value}
        onChange={setValue}
        hint="Tối đa 60 ký tự"
        error={error}
      />
    );
  }

  it('is labelled, reports typed text and shows the hint', async () => {
    renderWithI18n(<Field />);
    const input = screen.getByLabelText<HTMLInputElement>('Tên món');
    await userEvent.type(input, 'Hotdog');
    expect(input.value).toBe('Hotdog');
    expect(screen.getByText('Tối đa 60 ký tự')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('marks the field invalid and replaces the hint with the error', () => {
    renderWithI18n(<Field error="Tên món là bắt buộc" />);
    const input = screen.getByLabelText('Tên món');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const message = screen.getByText('Tên món là bắt buộc');
    expect(input.getAttribute('aria-describedby')).toBe(message.parentElement?.id);
    expect(screen.queryByText('Tối đa 60 ký tự')).toBeNull();
  });
});

describe('Card, Skeleton, Spinner, Icon', () => {
  it('renders a card with title, actions and content', () => {
    renderWithI18n(
      <Card title="Doanh thu" actions={<Button>Xem</Button>}>
        <p>Nội dung</p>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Doanh thu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xem' })).toBeTruthy();
    expect(screen.getByText('Nội dung')).toBeTruthy();
  });

  it('renders a card without a header when no title or actions are given', () => {
    renderWithI18n(<Card>Chỉ nội dung</Card>);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('hides skeletons and decorative icons from assistive technology', () => {
    const { container } = renderWithI18n(
      <>
        <Skeleton shape="row" />
        <Icon name="check" />
        <Icon name="check" label="Xong" />
      </>,
    );
    expect(container.querySelector('div[aria-hidden="true"]')).toBeTruthy();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Xong' })).toBeTruthy();
  });

  it('names the spinner in the current language', () => {
    renderWithI18n(<Spinner />, 'en');
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading');
  });
});

describe('EmptyState and ErrorState', () => {
  it('falls back to shared labels and shows the next action', () => {
    renderWithI18n(
      <EmptyState description="Thêm món đầu tiên" action={<Button>Thêm món</Button>} />,
    );
    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.getByText('Thêm món đầu tiên')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thêm món' })).toBeTruthy();
  });

  it('offers retry with a translated default label', async () => {
    const handleRetry = vi.fn();
    renderWithI18n(<ErrorState onRetry={handleRetry} />, 'en');
    expect(screen.getByRole('alert')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no retry button without a handler', () => {
    renderWithI18n(<ErrorState message="Không tải được đơn" />);
    expect(screen.getByText('Không tải được đơn')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Dialog', () => {
  it('shows title and content when open and closes on Escape', async () => {
    const handleClose = vi.fn();
    renderWithI18n(
      <Dialog open onClose={handleClose} title="Ngừng bán món?" description="Món sẽ ẩn trên POS.">
        <p>Chi tiết</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Ngừng bán món?' })).toBeTruthy();
    expect(screen.getByText('Món sẽ ẩn trên POS.')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the labelled close button and renders nothing when closed', async () => {
    const handleClose = vi.fn();
    const { rerender, i18n } = renderWithI18n(
      <Dialog open onClose={handleClose} title="Tiêu đề" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(i18n.language).toBe('vi');
    rerender(<Dialog open={false} onClose={handleClose} title="Tiêu đề" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Toaster', () => {
  it('shows a toast raised from anywhere and removes it when dismissed', () => {
    renderWithI18n(<Toaster />);
    let id = 0;
    act(() => {
      id = toast({ tone: 'success', message: 'Đã lưu món' });
    });
    expect(screen.getByText('Đã lưu món')).toBeTruthy();
    act(() => {
      dismissToast(id);
    });
    expect(screen.queryByText('Đã lưu món')).toBeNull();
  });

  it('runs the toast action', async () => {
    const handleUndo = vi.fn();
    renderWithI18n(<Toaster />);
    act(() => {
      toast({ message: 'Đã xoá', action: { label: 'Hoàn tác', onClick: handleUndo } });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }));
    expect(handleUndo).toHaveBeenCalledTimes(1);
    act(() => {
      dismissToast();
    });
  });
});

describe('LanguageSwitcher', () => {
  it('shows both languages and reports the picked one', async () => {
    const handleChange = vi.fn();
    renderWithI18n(<LanguageSwitcher value="vi" onChange={handleChange} />);
    const vietnamese = screen.getByRole('radio', { name: 'Tiếng Việt' });
    expect(vietnamese.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(handleChange).toHaveBeenCalledWith('en');
  });

  it('keeps the current language when it is pressed again', async () => {
    const handleChange = vi.fn();
    renderWithI18n(<LanguageSwitcher value="vi" onChange={handleChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Tiếng Việt' }));
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe('ThemeProvider and ThemeSwitcher', () => {
  function ModeControls() {
    const { preference, mode, setPreference } = useThemeMode();
    return (
      <>
        <ThemeSwitcher value={preference} onChange={setPreference} />
        <output>{mode}</output>
      </>
    );
  }

  it('applies the theme, starts from its default and offers three choices', () => {
    renderWithI18n(
      <ThemeProvider theme="admin">
        <ModeControls />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('admin');
    // jsdom has no matchMedia, so "system" resolves to light.
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(screen.getByRole('radio', { name: 'Theo hệ thống' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('switches mode without reload and stores the choice on the device', async () => {
    renderWithI18n(
      <ThemeProvider theme="admin">
        <ModeControls />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Tối' }));
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(window.localStorage.getItem('fnb.admin.theme-mode')).toBe('dark');
    expect(screen.getByRole('status').textContent).toBe('dark');
  });

  it('restores the stored choice and ignores a corrupt value', () => {
    window.localStorage.setItem('fnb.admin.theme-mode', 'dark');
    const first = renderWithI18n(
      <ThemeProvider theme="admin">
        <ModeControls />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.mode).toBe('dark');
    first.unmount();

    window.localStorage.setItem('fnb.admin.theme-mode', 'purple');
    renderWithI18n(
      <ThemeProvider theme="admin">
        <ModeControls />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('follows the operating system while the choice is "system"', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    try {
      renderWithI18n(
        <ThemeProvider theme="admin">
          <ModeControls />
        </ThemeProvider>,
      );
      expect(document.documentElement.dataset.mode).toBe('dark');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws a clear error when the hook is used without the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderWithI18n(<ModeControls />)).toThrow(/inside ThemeProvider/);
    consoleError.mockRestore();
  });
});
