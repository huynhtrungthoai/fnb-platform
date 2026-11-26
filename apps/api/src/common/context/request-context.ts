import { AsyncLocalStorage } from 'node:async_hooks';

/** Facts about the request being handled, readable anywhere below the middleware. */
export interface RequestContextStore {
  requestId: string;
  ip: string | null;
  /** Filled by the access guard once the caller is known. */
  userId?: string;
  branchId?: string;
  deviceId?: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/** Access to the per-request store. Outside a request (CLI, jobs) `get()` returns `undefined`. */
export const RequestContext = {
  run<T>(store: RequestContextStore, work: () => T): T {
    return storage.run(store, work);
  },
  get(): RequestContextStore | undefined {
    return storage.getStore();
  },
  /** Adds facts to the current request; a no-op outside a request. */
  assign(patch: Partial<RequestContextStore>): void {
    const store = storage.getStore();
    if (store) {
      Object.assign(store, patch);
    }
  },
};
