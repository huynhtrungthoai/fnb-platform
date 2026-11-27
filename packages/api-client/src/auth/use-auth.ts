import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type { AuthApi } from './auth-api';
import type { ChangePassword, ChangePin, LoginInput } from '@fnb/contract';

/** Query of the caller and their permissions; `null` when signed out. */
export function meQueryOptions(auth: AuthApi) {
  return queryOptions({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => auth.me(signal),
    // Permissions change rarely and `permissions.changed` (M1-26) triggers a reload.
    staleTime: 5 * 60_000,
  });
}

/** The caller and their permissions at each branch (`GET /auth/me`); `null` when signed out. */
export function useMe() {
  const { auth } = useApi();
  return useQuery(meQueryOptions(auth));
}

/** Signs in, then drops every cached query of the previous session and reloads `me`. */
export function useLogin() {
  const { auth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => auth.login(input),
    onSuccess: () => queryClient.resetQueries(),
  });
}

/** Signs out (always succeeds locally) and forgets every cached query. */
export function useLogout(options: { everywhere?: boolean } = {}) {
  const { auth } = useApi();
  const queryClient = useQueryClient();
  const everywhere = options.everywhere ?? false;
  return useMutation({
    mutationFn: () => (everywhere ? auth.logoutEverywhere() : auth.logout()),
    onSettled: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      queryClient.setQueryData(queryKeys.auth.me, null);
    },
  });
}

/** Changes the caller's own PIN; the server ends other sessions and returns new tokens. */
export function useChangePin() {
  const { auth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePin) => auth.changePin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}

/** Super admin: changes their own password; returns new tokens like `useChangePin`. */
export function useChangePassword() {
  const { auth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePassword) => auth.changePassword(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}
