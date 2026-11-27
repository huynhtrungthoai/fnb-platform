import { createAuditApi } from './audit/audit-api';
import { createAuthApi } from './auth/auth-api';
import { createBranchesApi } from './branches/branches-api';
import { createDevicesApi } from './devices/devices-api';
import { createHttpClient } from './http-client';
import { createRolesApi } from './roles/roles-api';
import { createUsersApi } from './users/users-api';

import type { AuditApi } from './audit/audit-api';
import type { AuthApi } from './auth/auth-api';
import type { BranchesApi } from './branches/branches-api';
import type { DevicesApi } from './devices/devices-api';
import type { HttpClient, HttpClientOptions } from './http-client';
import type { RolesApi } from './roles/roles-api';
import type { UsersApi } from './users/users-api';

/** The HTTP client plus the typed calls of each API module. */
export interface ApiClient {
  http: HttpClient;
  auth: AuthApi;
  branches: BranchesApi;
  users: UsersApi;
  roles: RolesApi;
  devices: DevicesApi;
  audit: AuditApi;
}

/** Creates the API client of one app; call once at start-up (`src/lib/api.ts`). */
export function createApiClient(options: HttpClientOptions): ApiClient {
  const http = createHttpClient(options);
  return {
    http,
    auth: createAuthApi(http),
    branches: createBranchesApi(http),
    users: createUsersApi(http),
    roles: createRolesApi(http),
    devices: createDevicesApi(http),
    audit: createAuditApi(http),
  };
}
