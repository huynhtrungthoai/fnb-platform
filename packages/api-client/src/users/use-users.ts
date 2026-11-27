import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type { CreateUserInput, SetAssignment, UpdateUser, UserListQuery } from '@fnb/contract';

/** One page of staff; the previous page stays on screen while the next one loads. */
export function useUsers(query: Partial<UserListQuery>, options: { enabled?: boolean } = {}) {
  const { users } = useApi();
  return useQuery({
    queryKey: queryKeys.users.list(query),
    queryFn: ({ signal }) => users.list(query, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** One staff member; `id` null waits. */
export function useUser(id: string | null) {
  const { users } = useApi();
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: ({ signal }) => users.get(id ?? '', signal),
    enabled: id !== null,
  });
}

/** Effective permissions of a staff member at each branch (CORE-29). */
export function useUserAccess(id: string | null) {
  const { users } = useApi();
  return useQuery({
    queryKey: queryKeys.users.access(id ?? ''),
    queryFn: ({ signal }) => users.access(id ?? '', signal),
    enabled: id !== null,
  });
}

/**
 * Reloads staff data. Assignments also change role member counts and, when the caller edits
 * their own account elsewhere, their `me`.
 */
function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
    ]);
  };
}

/** Creates an account with a temporary PIN. */
export function useCreateUser() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => users.create(input),
    onSuccess: invalidate,
  });
}

/** Changes name or phone. */
export function useUpdateUser() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUser }) => users.update(id, input),
    onSuccess: invalidate,
  });
}

/** Disables (`isActive: false`) or enables an account. */
export function useSetUserActive() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      users.setActive(id, isActive),
    onSuccess: invalidate,
  });
}

/** Sets or removes the group of a user at one branch (`roleId` null removes). */
export function useAssignRole() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({
      id,
      branchId,
      roleId,
    }: {
      id: string;
      branchId: SetAssignment['branchId'];
      roleId: string | null;
    }) =>
      roleId === null
        ? users.removeAssignment(id, branchId)
        : users.setAssignment(id, { branchId, roleId }),
    onSuccess: invalidate,
  });
}

/** Sets a temporary PIN chosen by the screen; it is shown once to hand over. */
export function useResetPin() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => users.resetPin(id, pin),
    onSuccess: invalidate,
  });
}

/** Unlocks an account locked by wrong PINs. */
export function useUnlockUser() {
  const { users } = useApi();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => users.unlock(id),
    onSuccess: invalidate,
  });
}
