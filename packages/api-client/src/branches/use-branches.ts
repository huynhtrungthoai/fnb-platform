import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type {
  BranchListQuery,
  CreateBranchInput,
  UpdateBranch,
  UpdateBranchSettings,
} from '@fnb/contract';

/** Branches the caller may see. */
export function useBranches(query: Partial<BranchListQuery> = {}) {
  const { branches } = useApi();
  return useQuery({
    queryKey: queryKeys.branches.list(query),
    queryFn: ({ signal }) => branches.list(query, signal),
  });
}

/** One branch; `id` null waits. */
export function useBranch(id: string | null) {
  const { branches } = useApi();
  return useQuery({
    queryKey: queryKeys.branches.detail(id ?? ''),
    queryFn: ({ signal }) => branches.get(id ?? '', signal),
    enabled: id !== null,
  });
}

/** Settings of one branch; `id` null waits. */
export function useBranchSettings(id: string | null) {
  const { branches } = useApi();
  return useQuery({
    queryKey: queryKeys.branches.settings(id ?? ''),
    queryFn: ({ signal }) => branches.getSettings(id ?? '', signal),
    enabled: id !== null,
  });
}

/** Reloads branch lists and the caller's `me` (it carries branch names and status). */
function useInvalidateBranches() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    ]);
  };
}

/** Creates a branch with default settings. */
export function useCreateBranch() {
  const { branches } = useApi();
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => branches.create(input),
    onSuccess: invalidate,
  });
}

/** Changes name, code, address, phone or coordinates. */
export function useUpdateBranch() {
  const { branches } = useApi();
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBranch }) => branches.update(id, input),
    onSuccess: invalidate,
  });
}

/** Deactivates (`isActive: false`) or reactivates a branch. */
export function useSetBranchActive() {
  const { branches } = useApi();
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? branches.activate(id) : branches.deactivate(id),
    onSuccess: invalidate,
  });
}

/** Changes the settings of one branch. */
export function useUpdateBranchSettings() {
  const { branches } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBranchSettings }) =>
      branches.updateSettings(id, input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.branches.settings(settings.branchId), settings);
    },
  });
}
