import { apiErrorSchema, errorCodeSchema } from '@fnb/contract';

import type { ErrorCode, ValidationIssue } from '@fnb/contract';

/** Codes the client raises itself, never sent by the API. */
export const CLIENT_ERROR_CODES = ['NETWORK_ERROR', 'INVALID_RESPONSE'] as const;

/** A code the client raises itself. */
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

/**
 * Every failed call rejects with this error: a business code from the API (`ERROR_CODES`),
 * a client code (`CLIENT_ERROR_CODES`), or an unknown code sent by a newer API.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    /** Stable code to translate, never a sentence. */
    readonly code: string,
    /** HTTP status; 0 when the server was not reached. */
    readonly status: number,
    readonly params: Record<string, unknown> = {},
    readonly issues: ValidationIssue[] = [],
    readonly requestId?: string,
    options?: { cause?: unknown },
  ) {
    super(code, options);
  }

  /** The server was not reached (offline, DNS, CORS, aborted by timeout). */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  /** Worth retrying: the server was not reached or failed on its side. */
  get isRetryable(): boolean {
    return this.isNetworkError || this.status >= 500;
  }
}

/** Narrows an unknown thrown value to `ApiError`. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Builds the error of a non-2xx response from its body (any shape). */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError(status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_RESPONSE', status);
  }
  const { code, params, issues, requestId } = parsed.data.error;
  return new ApiError(code, status, params ?? {}, issues ?? [], requestId);
}

/**
 * The `errors` namespace key that describes an error (plans/40-i18n-copy.md section 5).
 * Unknown codes fall back to `errors:generic`, which shows the code.
 */
export function errorMessageKey(error: unknown): {
  key: string;
  params: Record<string, unknown>;
} {
  if (!isApiError(error)) {
    return { key: 'errors:generic', params: { code: 'UNKNOWN' } };
  }
  if (error.isNetworkError) {
    return { key: 'errors:network', params: {} };
  }
  const known = errorCodeSchema.safeParse(error.code);
  if (known.success) {
    return { key: `errors:${known.data satisfies ErrorCode}`, params: error.params };
  }
  return { key: 'errors:generic', params: { ...error.params, code: error.code } };
}
