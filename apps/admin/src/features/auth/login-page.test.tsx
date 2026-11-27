import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { errorBody, renderWithApp } from '../../test/render-app';
import { LoginPage } from './login-page';

const TOKENS = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
  refreshToken: 'refresh-1-0123456789abcdef',
  refreshTokenExpiresAt: '2099-01-01T00:00:00.000Z',
  mustChangePin: true,
};

describe('LoginPage', () => {
  it('signs in with username and one secret field, and reports the tokens', async () => {
    const handleSignedIn = vi.fn();
    const { requests, tokenStore } = renderWithApp(<LoginPage onSignedIn={handleSignedIn} />, {
      signedIn: false,
      handler: () => ({ status: 200, body: { data: TOKENS } }),
    });
    await userEvent.type(screen.getByLabelText('Tên đăng nhập'), ' Lan ');
    await userEvent.type(screen.getByLabelText('PIN hoặc mật khẩu'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await vi.waitFor(() => {
      expect(handleSignedIn).toHaveBeenCalledWith(TOKENS);
    });
    expect(requests[0]?.path).toBe('/auth/login');
    expect(requests[0]?.body).toEqual({ username: 'lan', secret: '123456' });
    expect(tokenStore.get()?.accessToken).toBe('access-1');
  });

  it('shows the same translated error for any wrong credential and clears the secret', async () => {
    renderWithApp(<LoginPage onSignedIn={vi.fn()} />, {
      signedIn: false,
      locale: 'en',
      handler: () => ({ status: 401, body: errorBody('INVALID_CREDENTIALS') }),
    });
    await userEvent.type(screen.getByLabelText('Username'), 'lan');
    await userEvent.type(screen.getByLabelText('PIN or password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Wrong username or PIN/password');
    expect(screen.getByLabelText<HTMLInputElement>('PIN or password').value).toBe('');
  });

  it('asks for both fields before calling the API', async () => {
    const { requests } = renderWithApp(<LoginPage onSignedIn={vi.fn()} />, {
      signedIn: false,
      handler: () => ({ status: 500 }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findAllByText('Quá ngắn hoặc quá nhỏ')).toHaveLength(2);
    expect(requests).toHaveLength(0);
  });
});
