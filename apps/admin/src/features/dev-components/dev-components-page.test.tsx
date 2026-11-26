import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createI18n } from '@fnb/i18n';
import { ThemeProvider, Toaster } from '@fnb/ui-web';

import { DevComponentsPage } from './dev-components-page';

function renderPage() {
  const i18n = createI18n({ locale: 'vi', plugins: [initReactI18next] });
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme="admin">
        <DevComponentsPage onLocaleChange={(locale) => void i18n.changeLanguage(locale)} />
        <Toaster />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return i18n;
}

describe('DevComponentsPage (admin)', () => {
  it('renders the Web component set in Vietnamese with the admin theme', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Trang mẫu component' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nút chính' })).toBeTruthy();
    expect(screen.getByLabelText('Tên món')).toBeTruthy();
    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('admin');
  });

  it('switches the whole page to English and back without a reload', async () => {
    const i18n = renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(i18n.language).toBe('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Component sample page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Primary' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: 'Tiếng Việt' }));
    expect(screen.getByRole('button', { name: 'Nút chính' })).toBeTruthy();
  });

  it('switches between light and dark and remembers the choice', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Tối' }));
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(window.localStorage.getItem('fnb.admin.theme-mode')).toBe('dark');
    await userEvent.click(screen.getByRole('radio', { name: 'Sáng' }));
    expect(document.documentElement.dataset.mode).toBe('light');
  });

  it('opens the dialog and shows a toast', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại' }));
    expect(screen.getByRole('dialog', { name: 'Hộp thoại mẫu' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Thông báo thành công' }));
    expect(screen.getByText('Đã lưu thay đổi.')).toBeTruthy();
  });
});
