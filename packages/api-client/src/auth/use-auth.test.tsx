import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createApiClient } from '../create-api-client';
import { ApiProvider } from '../provider';
import { createQueryClient } from '../query-client';
import { createFakeFetch, errorBody, tokens } from '../test/fake-api';
import { createMemoryTokenStore } from '../token-store';
import { useLogin, useLogout, useMe } from './use-auth';

import type { RecordedRequest } from '../test/fake-api';
import type { Me } from '@fnb/contract';
import type { ReactNode } from 'react';

const ME: Me = {
  user: {
    id: '01900000-0000-7000-8000-000000000010',
    username: 'lan',
    fullName: 'Lan',
    phone: null,
    avatarMediaId: null,
    credentialType: 'pin',
    isActive: true,
    isLocked: false,
    lockedUntil: null,
    mustChangePin: false,
    lastLoginAt: null,
    createdAt: '2026-11-27T00:00:00.000Z',
    updatedAt: '2026-11-27T00:00:00.000Z',
  },
  hasAllBranches: false,
  branches: [],
  businessPermissions: [],
  permissionsVersion: 'v1',
};

function setup(
  handler: (request: RecordedRequest) => { status: number; body?: unknown },
  initial: ReturnType<typeof tokens> | null = null,
) {
  const fake = createFakeFetch(handler);
  const client = createApiClient({
    baseUrl: 'http://api.test',
    tokenStore: createMemoryTokenStore(initial),
    fetch: fake.fetchFn,
  });
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <ApiProvider client={client} queryClient={queryClient}>
      {children}
    </ApiProvider>
  );
  return { client, queryClient, wrapper, requests: fake.requests };
}

function handleAuth(request: RecordedRequest) {
  if (request.url.endsWith('/auth/login')) {
    return { status: 200, body: { data: tokens('a') } };
  }
  if (request.url.endsWith('/auth/me')) {
    return { status: 200, body: { data: ME } };
  }
  return { status: 204 };
}

describe('auth hooks', () => {
  it('reports null without calling the API while signed out', async () => {
    const { wrapper, requests } = setup(handleAuth);

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it('signs in, stores the tokens and loads me', async () => {
    const { client, wrapper } = setup(handleAuth);

    const { result } = renderHook(() => ({ me: useMe(), login: useLogin() }), { wrapper });
    await waitFor(() => {
      expect(result.current.me.data).toBeNull();
    });

    await act(() => result.current.login.mutateAsync({ username: 'lan', secret: '482915' }));

    await waitFor(() => {
      expect(result.current.me.data?.user.username).toBe('lan');
    });
    expect(client.http.tokenStore.get()?.accessToken).toBe('access-a');
  });

  it('signs out locally even when the server cannot be reached', async () => {
    const { client, wrapper } = setup((request) => {
      if (request.url.endsWith('/auth/logout')) {
        return { status: 503, body: errorBody('INTERNAL_ERROR') };
      }
      return handleAuth(request);
    }, tokens('a'));

    const { result } = renderHook(() => ({ me: useMe(), logout: useLogout() }), { wrapper });
    await waitFor(() => {
      expect(result.current.me.data?.user.username).toBe('lan');
    });

    await act(() => result.current.logout.mutateAsync());

    expect(client.http.tokenStore.get()).toBeNull();
    await waitFor(() => {
      expect(result.current.me.data).toBeNull();
    });
  });

  it('turns me into null when the session ends for good', async () => {
    const { client, wrapper } = setup((request) => {
      if (request.url.endsWith('/auth/refresh')) {
        return { status: 401, body: errorBody('UNAUTHENTICATED') };
      }
      return { status: 401, body: errorBody('TOKEN_EXPIRED') };
    }, tokens('a'));

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(client.http.tokenStore.get()).toBeNull();
  });
});
