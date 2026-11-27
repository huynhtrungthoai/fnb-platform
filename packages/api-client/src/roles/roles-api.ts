import { permissionInfoSchema, roleSchema } from '@fnb/contract';

import { emptySchema } from '../http-client';

import type { HttpClient } from '../http-client';
import type { CloneRole, CreateRoleInput, PermissionInfo, Role, UpdateRole } from '@fnb/contract';

/** Calls of the `rbac` module about permission groups (CORE-20 → 29). */
export interface RolesApi {
  /** The permission catalog, for the tick screen. Names come from i18n `permissions`. */
  permissions(signal?: AbortSignal): Promise<PermissionInfo[]>;
  list(signal?: AbortSignal): Promise<Role[]>;
  get(id: string, signal?: AbortSignal): Promise<Role>;
  /** A custom group; the API adds the permissions the ticked ones require. */
  create(input: CreateRoleInput): Promise<Role>;
  clone(id: string, input: CloneRole): Promise<Role>;
  update(id: string, input: UpdateRole): Promise<Role>;
  /** A default group back to its installation permissions and limits. */
  restoreDefault(id: string): Promise<Role>;
  /** Only a custom group nobody is assigned to. */
  delete(id: string): Promise<void>;
}

const withSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

/** Binds the role calls to an HTTP client. */
export function createRolesApi(http: HttpClient): RolesApi {
  const path = (id: string) => `/roles/${encodeURIComponent(id)}`;
  return {
    permissions: (signal) =>
      http.get('/permissions', permissionInfoSchema.array(), withSignal(signal)),
    list: (signal) => http.get('/roles', roleSchema.array(), withSignal(signal)),
    get: (id, signal) => http.get(path(id), roleSchema, withSignal(signal)),
    create: (input) => http.post('/roles', roleSchema, { body: input }),
    clone: (id, input) => http.post(`${path(id)}/clone`, roleSchema, { body: input }),
    update: (id, input) => http.patch(path(id), roleSchema, { body: input }),
    restoreDefault: (id) => http.post(`${path(id)}/restore-default`, roleSchema),
    delete: async (id) => {
      await http.delete(path(id), emptySchema);
    },
  };
}
