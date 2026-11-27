import { QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { queryKeys } from './query-keys';

import type { ApiClient } from './create-api-client';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const ApiContext = createContext<ApiClient | null>(null);

/** Props of `ApiProvider`. */
export interface ApiProviderProps {
  client: ApiClient;
  queryClient: QueryClient;
  children?: ReactNode;
}

/**
 * Gives the screens the API client and the query cache. When the session ends for good, `me`
 * becomes `null` and the other cached data is dropped, so route guards send the user to sign in.
 */
export function ApiProvider({ client, queryClient, children }: ApiProviderProps) {
  useEffect(
    () =>
      client.http.onSessionExpired(() => {
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
        queryClient.setQueryData(queryKeys.auth.me, null);
      }),
    [client, queryClient],
  );
  return (
    <ApiContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}

/** The API client of the app; only inside `ApiProvider`. */
export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error('useApi must be used inside ApiProvider');
  }
  return client;
}
