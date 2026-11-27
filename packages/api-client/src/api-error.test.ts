import { describe, expect, it } from 'vitest';

import { ApiError, apiErrorFromBody, errorMessageKey } from './api-error';

describe('apiErrorFromBody', () => {
  it('reads code, params, issues and request id', () => {
    const error = apiErrorFromBody(422, {
      error: {
        code: 'VALIDATION_FAILED',
        issues: [{ path: 'name.vi', rule: 'too_small' }],
        requestId: 'req-1',
      },
    });

    expect(error).toMatchObject({ code: 'VALIDATION_FAILED', status: 422, requestId: 'req-1' });
    expect(error.issues).toEqual([{ path: 'name.vi', rule: 'too_small' }]);
  });

  it('falls back when the body is not an error envelope (proxy page, empty body)', () => {
    expect(apiErrorFromBody(502, null).code).toBe('INTERNAL_ERROR');
    expect(apiErrorFromBody(404, '<html>').code).toBe('INVALID_RESPONSE');
  });
});

describe('errorMessageKey', () => {
  it('maps a known code to its errors key with params', () => {
    expect(errorMessageKey(new ApiError('ROLE_IN_USE', 409, { count: 2 }))).toEqual({
      key: 'errors:ROLE_IN_USE',
      params: { count: 2 },
    });
  });

  it('maps network errors and unknown codes to the shared messages', () => {
    expect(errorMessageKey(new ApiError('NETWORK_ERROR', 0)).key).toBe('errors:network');
    expect(errorMessageKey(new ApiError('SOME_NEW_CODE', 400))).toEqual({
      key: 'errors:generic',
      params: { code: 'SOME_NEW_CODE' },
    });
    expect(errorMessageKey(new TypeError('boom'))).toEqual({
      key: 'errors:generic',
      params: { code: 'UNKNOWN' },
    });
  });
});
