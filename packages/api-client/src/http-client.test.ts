import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError } from './api-error';
import { createHttpClient, emptySchema } from './http-client';
import { createFakeFetch, errorBody, tokens } from './test/fake-api';
import { createMemoryTokenStore } from './token-store';

const itemSchema = z.object({ id: z.string() });
const BRANCH_ID = '01900000-0000-7000-8000-000000000001';

function setup(handler: Parameters<typeof createFakeFetch>[0], initial = tokens('a')) {
  const fake = createFakeFetch(handler);
  const tokenStore = createMemoryTokenStore(initial);
  const http = createHttpClient({
    baseUrl: 'http://api.test/',
    tokenStore,
    fetch: fake.fetchFn,
    getBranchId: () => BRANCH_ID,
  });
  return { http, tokenStore, requests: fake.requests };
}

describe('createHttpClient', () => {
  it('unwraps data, sends the token, the branch and the query string', async () => {
    const { http, requests } = setup(() => ({ status: 200, body: { data: { id: 'x' } } }));

    const item = await http.get('/items', itemSchema, {
      query: { search: 'phở', status: ['active', 'hidden'], page: 2, skip: undefined },
    });

    expect(item).toEqual({ id: 'x' });
    expect(requests[0]?.url).toBe(
      'http://api.test/items?search=ph%E1%BB%9F&status=active&status=hidden&page=2',
    );
    expect(requests[0]?.headers.authorization).toBe('Bearer access-a');
    expect(requests[0]?.headers['x-branch-id']).toBe(BRANCH_ID);
  });

  it('sends JSON bodies and lets a request drop the branch header', async () => {
    const { http, requests } = setup(() => ({ status: 201, body: { data: { id: 'n' } } }));

    await http.post('/items', itemSchema, { body: { name: 'A' }, branchId: null });

    expect(requests[0]?.body).toEqual({ name: 'A' });
    expect(requests[0]?.headers['content-type']).toBe('application/json');
    expect(requests[0]?.headers['x-branch-id']).toBeUndefined();
  });

  it('parses pages and empty responses', async () => {
    const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
    const { http } = setup((request) =>
      request.method === 'GET'
        ? { status: 200, body: { data: [{ id: 'x' }], meta } }
        : { status: 204 },
    );

    await expect(http.getPage('/items', itemSchema)).resolves.toEqual({
      data: [{ id: 'x' }],
      meta,
    });
    await expect(http.delete('/items/x', emptySchema)).resolves.toBeNull();
  });

  it('turns error bodies into ApiError with code, params and request id', async () => {
    const { http } = setup(() => ({
      status: 409,
      body: errorBody('ROLE_IN_USE', { count: 3 }),
    }));

    const error = await http.get('/roles/x', itemSchema).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'ROLE_IN_USE', status: 409, params: { count: 3 } });
    expect(error).toMatchObject({ requestId: 'req-1', isRetryable: false });
  });

  it('reports a response that does not match the schema as INVALID_RESPONSE', async () => {
    const { http } = setup(() => ({ status: 200, body: { data: { id: 42 } } }));

    await expect(http.get('/items/x', itemSchema)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('reports an unreachable server as a retryable NETWORK_ERROR', async () => {
    const { http } = setup(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(http.get('/items', itemSchema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
      isRetryable: true,
    });
  });

  it('lets a caller abort see its own AbortError', async () => {
    const controller = new AbortController();
    controller.abort();
    const { http } = setup(() => Promise.reject(new DOMException('aborted', 'AbortError')));

    await expect(
      http.get('/items', itemSchema, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('refreshes once on TOKEN_EXPIRED, stores the new pair and repeats the request', async () => {
    const { http, tokenStore, requests } = setup((request) => {
      if (request.url.endsWith('/auth/refresh')) {
        return { status: 200, body: { data: tokens('b') } };
      }
      return request.headers.authorization === 'Bearer access-b'
        ? { status: 200, body: { data: { id: 'x' } } }
        : { status: 401, body: errorBody('TOKEN_EXPIRED') };
    });

    await expect(http.get('/items/x', itemSchema)).resolves.toEqual({ id: 'x' });

    expect(tokenStore.get()?.accessToken).toBe('access-b');
    expect(requests.map((request) => request.url)).toEqual([
      'http://api.test/items/x',
      'http://api.test/auth/refresh',
      'http://api.test/items/x',
    ]);
    expect(requests[1]?.body).toEqual({ refreshToken: tokens('a').refreshToken });
    expect(requests[1]?.headers.authorization).toBeUndefined();
  });

  it('shares one refresh between requests that fail together', async () => {
    const { http, requests } = setup((request) => {
      if (request.url.endsWith('/auth/refresh')) {
        return { status: 200, body: { data: tokens('b') } };
      }
      return request.headers.authorization === 'Bearer access-b'
        ? { status: 200, body: { data: { id: 'x' } } }
        : { status: 401, body: errorBody('TOKEN_EXPIRED') };
    });

    await Promise.all([
      http.get('/items/1', itemSchema),
      http.get('/items/2', itemSchema),
      http.get('/items/3', itemSchema),
    ]);

    expect(requests.filter((request) => request.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('reuses a pair another tab already rotated instead of spending the refresh token', async () => {
    const { http, tokenStore, requests } = setup((request) => {
      if (request.headers.authorization === 'Bearer access-a') {
        // Another tab rotates the pair while this request is in flight.
        tokenStore.set(tokens('other-tab'));
        return { status: 401, body: errorBody('TOKEN_EXPIRED') };
      }
      return { status: 200, body: { data: { id: 'x' } } };
    });

    await http.get('/items/x', itemSchema);

    expect(requests.some((request) => request.url.endsWith('/auth/refresh'))).toBe(false);
    expect(requests[1]?.headers.authorization).toBe('Bearer access-other-tab');
  });

  it('ends the session when the refresh is refused', async () => {
    const { http, tokenStore } = setup((request) =>
      request.url.endsWith('/auth/refresh')
        ? { status: 401, body: errorBody('UNAUTHENTICATED') }
        : { status: 401, body: errorBody('TOKEN_EXPIRED') },
    );
    const onExpired = vi.fn();
    http.onSessionExpired(onExpired);

    await expect(http.get('/items/x', itemSchema)).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    });

    expect(tokenStore.get()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the tokens when the refresh cannot reach the server', async () => {
    const { http, tokenStore } = setup((request) =>
      request.url.endsWith('/auth/refresh')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : { status: 401, body: errorBody('TOKEN_EXPIRED') },
    );
    const onExpired = vi.fn();
    http.onSessionExpired(onExpired);

    await expect(http.get('/items/x', itemSchema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    expect(tokenStore.get()?.accessToken).toBe('access-a');
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('never refreshes for requests sent without auth', async () => {
    const { http, requests } = setup(() => ({
      status: 401,
      body: errorBody('INVALID_CREDENTIALS'),
    }));

    await expect(
      http.post('/auth/login', itemSchema, { body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.authorization).toBeUndefined();
  });
});
