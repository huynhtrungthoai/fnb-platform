import { QueryClient } from '@tanstack/react-query';

import { isApiError } from './api-error';

/** How many times a failed query is tried again. */
const MAX_QUERY_RETRIES = 2;

/**
 * Query client with the app-wide defaults: queries retry only when retrying can help (offline
 * or a server error), never on a business error such as `PERMISSION_DENIED`; mutations never
 * retry on their own, because a write sent twice is not always safe.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          isApiError(error) && error.isRetryable && failureCount < MAX_QUERY_RETRIES,
      },
      mutations: { retry: false },
    },
  });
}
