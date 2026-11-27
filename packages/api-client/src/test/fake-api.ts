import type { AuthTokens } from '@fnb/contract';

/** One request the fake API received. */
export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

type Handler = (request: RecordedRequest) => { status: number; body?: unknown } | Promise<never>;

/** A `fetch` that answers from a list of handlers and records every request. */
export function createFakeFetch(handler: Handler) {
  const requests: RecordedRequest[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const rawBody = init?.body;
    const request: RecordedRequest = {
      method: init?.method ?? 'GET',
      url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      headers,
      body: typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody,
    };
    requests.push(request);
    const { status, body } = await handler(request);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-1' },
    });
  };
  return { fetchFn, requests };
}

/** A token pair whose tokens carry `label`, to tell pairs apart in assertions. */
export function tokens(label: string): AuthTokens {
  return {
    accessToken: `access-${label}`,
    accessTokenExpiresAt: '2026-11-27T10:15:00.000Z',
    refreshToken: `refresh-${label}-0123456789abcdef`,
    refreshTokenExpiresAt: '2026-12-04T10:00:00.000Z',
    mustChangePin: false,
  };
}

/** Body of an error response. */
export function errorBody(code: string, params?: Record<string, unknown>) {
  return { error: { code, ...(params ? { params } : {}), requestId: 'req-1' } };
}
