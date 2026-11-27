import type { AuditLogQuery, BranchListQuery, DeviceListQuery, UserListQuery } from '@fnb/contract';

/** Query keys of every API resource, so invalidation always matches the hook that reads it. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  branches: {
    all: ['branches'] as const,
    list: (query: Partial<BranchListQuery>) => ['branches', 'list', query] as const,
    detail: (id: string) => ['branches', 'detail', id] as const,
    settings: (id: string) => ['branches', 'settings', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (query: Partial<UserListQuery>) => ['users', 'list', query] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    access: (id: string) => ['users', 'access', id] as const,
  },
  roles: {
    all: ['roles'] as const,
    permissions: ['roles', 'permissions'] as const,
    list: ['roles', 'list'] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
  },
  devices: {
    all: ['devices'] as const,
    list: (query: Partial<DeviceListQuery>) => ['devices', 'list', query] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (query: Partial<AuditLogQuery>) => ['audit', 'list', query] as const,
  },
} as const;
