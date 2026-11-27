import { createAuthApi } from './auth/auth-api';
import { createHttpClient } from './http-client';

import type { AuthApi } from './auth/auth-api';
import type { HttpClient, HttpClientOptions } from './http-client';

/** The HTTP client plus the typed calls of each API module. */
export interface ApiClient {
  http: HttpClient;
  auth: AuthApi;
}

/** Creates the API client of one app; call once at start-up (`src/lib/api.ts`). */
export function createApiClient(options: HttpClientOptions): ApiClient {
  const http = createHttpClient(options);
  return { http, auth: createAuthApi(http) };
}
