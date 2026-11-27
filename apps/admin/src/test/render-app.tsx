import { render } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import {
  ApiProvider,
  createApiClient,
  createMemoryTokenStore,
  createQueryClient,
} from '@fnb/api-client';
import { createI18n } from '@fnb/i18n';
import { PermissionProvider, ThemeProvider, Toaster } from '@fnb/ui-web';

import type { ApiClient } from '@fnb/api-client';
import type { Locale, PermissionCode } from '@fnb/contract';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';

/** One request the fake API received. */
export interface FakeRequest {
  method: string;
  /** Path with the query string, without the origin. */
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Answers a request: a status and an optional JSON body. */
export type FakeHandler = (request: FakeRequest) => { status: number; body?: unknown };

/** A `fetch` that answers from `handler` and records every request. */
export function createFakeFetch(handler: FakeHandler) {
  const requests: FakeRequest[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const raw = init?.body;
    const request: FakeRequest = {
      method: init?.method ?? 'GET',
      path: `${url.pathname}${url.search}`,
      headers,
      body: typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw,
    };
    requests.push(request);
    const { status, body } = handler(request);
    return Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };
  return { fetchFn, requests };
}

/** Body of an API error response. */
export function errorBody(code: string, params?: Record<string, unknown>) {
  return { error: { code, ...(params ? { params } : {}), requestId: 'req-test' } };
}

/** Renders a screen the way the app mounts it, against a fake API. */
export function renderWithApp(
  ui: ReactElement,
  options: {
    handler: FakeHandler;
    locale?: Locale;
    permissions?: readonly PermissionCode[];
    signedIn?: boolean;
  },
) {
  const { fetchFn, requests } = createFakeFetch(options.handler);
  const tokenStore = createMemoryTokenStore();
  if (options.signedIn ?? true) {
    tokenStore.set({
      accessToken: 'access-test',
      accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      refreshToken: 'refresh-test-0123456789abcdef',
      refreshTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      mustChangePin: false,
    });
  }
  const api: ApiClient = createApiClient({
    baseUrl: 'http://api.test',
    tokenStore,
    fetch: fetchFn,
    getBranchId: () => 'b0000000-0000-7000-8000-000000000001',
  });
  const queryClient: QueryClient = createQueryClient();
  const i18n = createI18n({ locale: options.locale ?? 'vi', plugins: [initReactI18next] });
  const result = render(
    <I18nextProvider i18n={i18n}>
      <ApiProvider client={api} queryClient={queryClient}>
        <ThemeProvider theme="admin">
          <PermissionProvider permissions={options.permissions ?? []}>
            {ui}
            <Toaster />
          </PermissionProvider>
        </ThemeProvider>
      </ApiProvider>
    </I18nextProvider>,
  );
  return { ...result, requests, api, queryClient, i18n, tokenStore };
}
