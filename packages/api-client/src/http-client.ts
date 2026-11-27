import { z } from 'zod';

import { apiPageSchema, authTokensSchema } from '@fnb/contract';

import { ApiError, apiErrorFromBody } from './api-error';

import type { TokenStore } from './token-store';
import type { AuthTokens, Page } from '@fnb/contract';

/** Header that carries the branch chosen in the app (plans/06-permissions.md section 7). */
export const BRANCH_HEADER = 'X-Branch-Id';

/** Name of the Web Lock that serialises token refreshes across browser tabs. */
const REFRESH_LOCK = 'fnb-auth-refresh';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Schema for endpoints that answer `204 No Content` or `{ data: null }`. */
export const emptySchema = z.null();

/** Runs `task` while holding an exclusive lock named `name`. */
export type LockFn = <T>(name: string, task: () => Promise<T>) => Promise<T>;

/** How the client reaches the API and keeps the session. */
export interface HttpClientOptions {
  /** API origin with an optional path prefix, for example `http://localhost:4000`. */
  baseUrl: string;
  tokenStore: TokenStore;
  /** Branch chosen in the app, sent as `X-Branch-Id` on every request. */
  getBranchId?: () => string | null | undefined;
  /** Extra headers on every request, for example `X-Device-Token` on POS. */
  getHeaders?: () => Record<string, string | undefined>;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Defaults to the Web Locks API when present, so tabs sharing tokens refresh one at a time. */
  lock?: LockFn;
  /** Gives up on a request after this long; defaults to 30 seconds. */
  timeoutMs?: number;
}

/** A value of the query string; `null` and `undefined` are left out. */
export type QueryValue = string | number | boolean | null | undefined;

/** Options of one request. */
export interface RequestOptions {
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** `false` sends no token and never refreshes (login, refresh, device endpoints). */
  auth?: boolean;
  /** Overrides `getBranchId` for this request; `null` sends no branch. */
  branchId?: string | null;
}

/** Options of a request that sends a body: JSON, or `FormData` for uploads. */
export interface BodyRequestOptions extends RequestOptions {
  body?: unknown;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Typed HTTP client of the API: unwraps `{ data }`, parses it with Zod, refreshes tokens. */
export interface HttpClient {
  readonly tokenStore: TokenStore;
  get<S extends z.ZodType>(path: string, schema: S, options?: RequestOptions): Promise<z.output<S>>;
  /** A list endpoint: `{ data: [...], meta }`. */
  getPage<S extends z.ZodType>(
    path: string,
    itemSchema: S,
    options?: RequestOptions,
  ): Promise<Page<z.output<S>>>;
  post<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: BodyRequestOptions,
  ): Promise<z.output<S>>;
  put<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: BodyRequestOptions,
  ): Promise<z.output<S>>;
  patch<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: BodyRequestOptions,
  ): Promise<z.output<S>>;
  delete<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: BodyRequestOptions,
  ): Promise<z.output<S>>;
  /** Calls `listener` when the session ends for good (refresh refused); returns an unsubscribe. */
  onSessionExpired(listener: () => void): () => void;
}

/** Creates the HTTP client of one app. */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { tokenStore } = options;
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const lock = options.lock ?? defaultLock;
  const listeners = new Set<() => void>();
  let refreshing: Promise<AuthTokens | null> | null = null;

  const doFetch = (input: string, init: RequestInit): Promise<Response> =>
    (options.fetch ?? globalThis.fetch)(input, init);

  /** Sends one HTTP request and returns the parsed JSON body (null when empty). */
  async function send(
    method: Method,
    path: string,
    request: BodyRequestOptions,
    accessToken: string | undefined,
  ): Promise<{ status: number; body: unknown; requestId?: string }> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    for (const [name, value] of Object.entries(options.getHeaders?.() ?? {})) {
      if (value !== undefined) {
        headers[name] = value;
      }
    }
    const branchId = request.branchId === undefined ? options.getBranchId?.() : request.branchId;
    if (branchId) {
      headers[BRANCH_HEADER] = branchId;
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    let body: BodyInit | undefined;
    if (request.body instanceof FormData) {
      // The browser sets the multipart boundary itself.
      body = request.body;
    } else if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(request.body);
    }
    Object.assign(headers, request.headers);

    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await doFetch(buildUrl(baseUrl, path, request.query), {
        method,
        headers,
        body,
        signal,
      });
    } catch (error) {
      if (request.signal?.aborted) {
        // Cancelled by the caller (TanStack Query): let the caller see its own abort.
        throw error;
      }
      throw new ApiError('NETWORK_ERROR', 0, {}, [], undefined, { cause: error });
    }

    const requestId = response.headers.get('x-request-id') ?? undefined;
    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw new ApiError('NETWORK_ERROR', 0, {}, [], requestId, { cause: error });
    }
    let parsedBody: unknown = null;
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text);
      } catch (error) {
        throw new ApiError(
          response.ok ? 'INVALID_RESPONSE' : 'INTERNAL_ERROR',
          response.status,
          {},
          [],
          requestId,
          { cause: error },
        );
      }
    }
    if (!response.ok) {
      throw apiErrorFromBody(response.status, parsedBody);
    }
    return { status: response.status, body: parsedBody, ...(requestId ? { requestId } : {}) };
  }

  /** Exchanges the refresh token; `null` when the server refused it (the session is over). */
  async function exchange(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const { body } = await send('POST', '/auth/refresh', { body: { refreshToken } }, undefined);
      const parsed = z.object({ data: authTokensSchema }).safeParse(body);
      if (!parsed.success) {
        throw new ApiError('INVALID_RESPONSE', 200, {}, [], undefined, { cause: parsed.error });
      }
      tokenStore.set(parsed.data.data);
      return parsed.data.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      // Offline or server error: keep the tokens and let the caller retry later.
      throw error;
    }
  }

  /**
   * Gets a usable token pair after `failedToken` was rejected. One refresh at a time per client,
   * and per browser through the lock: a pair that another tab already rotated is reused instead
   * of refreshing again, because reusing a spent refresh token ends the session (CORE-15).
   */
  function renew(failedToken: string): Promise<AuthTokens | null> {
    refreshing ??= lock(REFRESH_LOCK, async () => {
      const current = tokenStore.get();
      if (!current) {
        return null;
      }
      if (current.accessToken !== failedToken) {
        return current;
      }
      return exchange(current.refreshToken);
    }).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  function expire(): void {
    tokenStore.clear();
    for (const listener of listeners) {
      listener();
    }
  }

  /** Sends with the stored token; on `TOKEN_EXPIRED` refreshes once and sends again. */
  async function call(method: Method, path: string, request: BodyRequestOptions) {
    const useAuth = request.auth ?? true;
    const token = useAuth ? tokenStore.get()?.accessToken : undefined;
    try {
      return await send(method, path, request, token);
    } catch (error) {
      if (!(error instanceof ApiError) || !useAuth || !token) {
        throw error;
      }
      if (error.code === 'TOKEN_EXPIRED') {
        const renewed = await renew(token);
        if (renewed) {
          try {
            return await send(method, path, request, renewed.accessToken);
          } catch (retryError) {
            if (retryError instanceof ApiError && isSessionError(retryError)) {
              expire();
            }
            throw retryError;
          }
        }
        expire();
      } else if (error.code === 'UNAUTHENTICATED') {
        expire();
      }
      throw error;
    }
  }

  async function data<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S,
    request: BodyRequestOptions = {},
  ): Promise<z.output<S>> {
    const response = await call(method, path, request);
    if (response.status === 204 || response.body === null) {
      return parseOrThrow(schema, null, response);
    }
    const envelope = z.object({ data: z.unknown() }).safeParse(response.body);
    if (!envelope.success) {
      throw invalidResponse(response, envelope.error);
    }
    return parseOrThrow(schema, envelope.data.data, response);
  }

  return {
    tokenStore,
    get: (path, schema, request) => data('GET', path, schema, request),
    getPage: async (path, itemSchema, request = {}) => {
      const response = await call('GET', path, request);
      const parsed = apiPageSchema(itemSchema).safeParse(response.body);
      if (!parsed.success) {
        throw invalidResponse(response, parsed.error);
      }
      return parsed.data;
    },
    post: (path, schema, request) => data('POST', path, schema, request),
    put: (path, schema, request) => data('PUT', path, schema, request),
    patch: (path, schema, request) => data('PATCH', path, schema, request),
    delete: (path, schema, request) => data('DELETE', path, schema, request),
    onSessionExpired: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function isSessionError(error: ApiError): boolean {
  return error.code === 'TOKEN_EXPIRED' || error.code === 'UNAUTHENTICATED';
}

function parseOrThrow<S extends z.ZodType>(
  schema: S,
  value: unknown,
  response: { status: number; requestId?: string },
): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw invalidResponse(response, parsed.error);
  }
  return parsed.data;
}

function invalidResponse(
  response: { status: number; requestId?: string },
  cause: unknown,
): ApiError {
  return new ApiError('INVALID_RESPONSE', response.status, {}, [], response.requestId, { cause });
}

function buildUrl(baseUrl: string, path: string, query: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query ?? {})) {
    const values: readonly QueryValue[] = Array.isArray(raw) ? raw : [raw as QueryValue];
    for (const value of values) {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    }
  }
  const search = params.toString();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}${search ? `?${search}` : ''}`;
}

const defaultLock: LockFn = (name, task) => {
  // React Native and older browsers have no Web Locks: tabs cannot share tokens there anyway.
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return task();
  }
  return navigator.locks.request(name, task);
};
