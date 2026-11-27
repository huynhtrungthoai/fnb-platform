import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type { CloneRole, CreateRoleInput, UpdateRole } from '@fnb/contract';

/** The permission catalog; it only changes with a new release. Needs `role.view`. */
export function usePermissionCatalog(options: { enabled?: boolean } = {}) {
  const { roles } = useApi();
  return useQuery({
    queryKey: queryKeys.roles.permissions,
    queryFn: ({ signal }) => roles.permissions(signal),
    staleTime: 60 * 60_000,
    enabled: options.enabled ?? true,
  });
}

/** Every permission group; pass `enabled: false` when the caller lacks `role.view`. */
export function useRoles(options: { enabled?: boolean } = {}) {
  const { roles } = useApi();
  return useQuery({
    queryKey: queryKeys.roles.list,
    queryFn: ({ signal }) => roles.list(signal),
    enabled: options.enabled ?? true,
  });
}

/** One permission group; `id` null waits. */
export function useRole(id: string | null) {
  const { roles } = useApi();
  return useQuery({
    queryKey: queryKeys.roles.detail(id ?? ''),
    queryFn: ({ signal }) => roles.get(id ?? '', signal),
    enabled: id !== null,
  });
}

/**
 * Reloads groups. A changed group changes what its members may do, the caller included,
 * so `me` and staff access views reload too.
 */
function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    ]);
  };
}

/** Creates a custom group. */
export function useCreateRole() {
  const { roles } = useApi();
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => roles.create(input),
    onSuccess: invalidate,
  });
}

/** Copies a group into a new custom group. */
export function useCloneRole() {
  const { roles } = useApi();
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CloneRole }) => roles.clone(id, input),
    onSuccess: invalidate,
  });
}

/** Changes names, permissions or limits of a group. */
export function useUpdateRole() {
  const { roles } = useApi();
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRole }) => roles.update(id, input),
    onSuccess: invalidate,
  });
}

/** Puts a default group back to its installation values. */
export function useRestoreRoleDefault() {
  const { roles } = useApi();
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) => roles.restoreDefault(id),
    onSuccess: invalidate,
  });
}

/** Deletes a custom group nobody is assigned to. */
export function useDeleteRole() {
  const { roles } = useApi();
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) => roles.delete(id),
    onSuccess: invalidate,
  });
}
