import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../provider';
import { queryKeys } from '../query-keys';

import type { DeviceListQuery } from '@fnb/contract';

/** Registered devices; pass `enabled: false` without `device.manage`. */
export function useDevices(query: Partial<DeviceListQuery>, options: { enabled?: boolean } = {}) {
  const { devices } = useApi();
  return useQuery({
    queryKey: queryKeys.devices.list(query),
    queryFn: ({ signal }) => devices.list(query, signal),
    enabled: options.enabled ?? true,
  });
}

/** Revokes a device. */
export function useRevokeDevice() {
  const { devices } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devices.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices.all }),
  });
}
