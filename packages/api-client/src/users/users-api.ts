import { userAccessSchema, userWithAssignmentsSchema } from '@fnb/contract';

import type { HttpClient } from '../http-client';
import type {
  CreateUserInput,
  Page,
  SetAssignment,
  UpdateUser,
  UserAccessView,
  UserListQuery,
  UserWithAssignments,
} from '@fnb/contract';

/** Calls of the `users` module (CORE-10, 11, 14, 29). */
export interface UsersApi {
  list(query?: Partial<UserListQuery>, signal?: AbortSignal): Promise<Page<UserWithAssignments>>;
  get(id: string, signal?: AbortSignal): Promise<UserWithAssignments>;
  /** Effective permissions of the user at each branch. */
  access(id: string, signal?: AbortSignal): Promise<UserAccessView>;
  /** The initial PIN is temporary: the user changes it at the first sign-in. */
  create(input: CreateUserInput): Promise<UserWithAssignments>;
  update(id: string, input: UpdateUser): Promise<UserWithAssignments>;
  /** Disabling also ends every session of the user. */
  setActive(id: string, isActive: boolean): Promise<UserWithAssignments>;
  /** Sets the group at one branch (`branchId: null`: every branch). */
  setAssignment(id: string, input: SetAssignment): Promise<UserWithAssignments>;
  /** Removes the group at one branch (`null`: the all-branches assignment). */
  removeAssignment(id: string, branchId: string | null): Promise<UserWithAssignments>;
  /** Sets a temporary PIN, unlocks the account and ends its sessions. */
  resetPin(id: string, pin: string): Promise<UserWithAssignments>;
  unlock(id: string): Promise<UserWithAssignments>;
}

const withSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

/** Binds the `users` calls to an HTTP client. */
export function createUsersApi(http: HttpClient): UsersApi {
  const path = (id: string) => `/users/${encodeURIComponent(id)}`;
  return {
    list: (query, signal) =>
      http.getPage('/users', userWithAssignmentsSchema, {
        query: {
          page: query?.page,
          pageSize: query?.pageSize,
          search: query?.search,
          status: query?.status,
          branchId: query?.branchId,
          roleId: query?.roleId,
        },
        ...withSignal(signal),
      }),
    get: (id, signal) => http.get(path(id), userWithAssignmentsSchema, withSignal(signal)),
    access: (id, signal) => http.get(`${path(id)}/access`, userAccessSchema, withSignal(signal)),
    create: (input) => http.post('/users', userWithAssignmentsSchema, { body: input }),
    update: (id, input) => http.patch(path(id), userWithAssignmentsSchema, { body: input }),
    setActive: (id, isActive) =>
      http.post(`${path(id)}/${isActive ? 'enable' : 'disable'}`, userWithAssignmentsSchema),
    setAssignment: (id, input) =>
      http.put(`${path(id)}/assignments`, userWithAssignmentsSchema, { body: input }),
    removeAssignment: (id, branchId) =>
      http.delete(
        `${path(id)}/assignments/${encodeURIComponent(branchId ?? 'all')}`,
        userWithAssignmentsSchema,
      ),
    resetPin: (id, pin) =>
      http.post(`${path(id)}/reset-pin`, userWithAssignmentsSchema, { body: { pin } }),
    unlock: (id) => http.post(`${path(id)}/unlock`, userWithAssignmentsSchema),
  };
}
