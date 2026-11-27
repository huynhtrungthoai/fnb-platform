import { deviceSchema } from '@fnb/contract';

import type { HttpClient } from '../http-client';
import type { Device, DeviceListQuery } from '@fnb/contract';

/** Admin calls of the `devices` module (CORE-30, 31). Registration happens on the POS itself. */
export interface DevicesApi {
  /** Devices at the branches where the caller holds `device.manage`. */
  list(query?: Partial<DeviceListQuery>, signal?: AbortSignal): Promise<Device[]>;
  /** Ends the device's token and sessions at once; its code is never reused. */
  revoke(id: string): Promise<Device>;
}

/** Binds the `devices` calls to an HTTP client. */
export function createDevicesApi(http: HttpClient): DevicesApi {
  return {
    list: (query, signal) =>
      http.get('/devices', deviceSchema.array(), {
        query: { branchId: query?.branchId, status: query?.status },
        ...(signal ? { signal } : {}),
      }),
    revoke: (id) => http.post(`/devices/${encodeURIComponent(id)}/revoke`, deviceSchema),
  };
}
