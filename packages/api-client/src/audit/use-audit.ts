import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type { AuditLogQuery } from '@fnb/contract';

/** One page of the audit log; the previous page stays on screen while the next one loads. */
export function useAuditLogs(query: Partial<AuditLogQuery>, options: { enabled?: boolean } = {}) {
  const { audit } = useApi();
  return useQuery({
    queryKey: queryKeys.audit.list(query),
    queryFn: ({ signal }) => audit.search(query, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}
