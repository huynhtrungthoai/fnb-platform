import { createApiClient, createQueryClient, createStorageTokenStore } from '@fnb/api-client';

/** Where the session tokens are kept; shared by every Admin tab on this browser. */
const TOKEN_STORAGE_KEY = 'fnb.admin.session';

// Falls back to the local API so a missing .env never crashes the dev server.
const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/** The API client of the admin app. The branch picker (M1-18) adds `getBranchId`. */
export const api = createApiClient({
  baseUrl,
  tokenStore: createStorageTokenStore(window.localStorage, TOKEN_STORAGE_KEY),
});

/** The query cache of the admin app. */
export const queryClient = createQueryClient();
