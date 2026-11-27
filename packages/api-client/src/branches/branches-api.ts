import { branchSchema, branchSettingsSchema } from '@fnb/contract';

import type { HttpClient } from '../http-client';
import type {
  Branch,
  BranchListQuery,
  BranchSettings,
  CreateBranchInput,
  UpdateBranch,
  UpdateBranchSettings,
} from '@fnb/contract';

/** Calls of the `branches` module (CORE-01, CORE-02). */
export interface BranchesApi {
  /** Branches the caller may see (`branch.view` at any branch). */
  list(query?: Partial<BranchListQuery>, signal?: AbortSignal): Promise<Branch[]>;
  get(id: string, signal?: AbortSignal): Promise<Branch>;
  create(input: CreateBranchInput): Promise<Branch>;
  update(id: string, input: UpdateBranch): Promise<Branch>;
  /** Stops new orders at the branch; its history stays readable. */
  deactivate(id: string): Promise<Branch>;
  activate(id: string): Promise<Branch>;
  getSettings(id: string, signal?: AbortSignal): Promise<BranchSettings>;
  updateSettings(id: string, input: UpdateBranchSettings): Promise<BranchSettings>;
}

const withSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

/** Binds the `branches` calls to an HTTP client. */
export function createBranchesApi(http: HttpClient): BranchesApi {
  const path = (id: string) => `/branches/${encodeURIComponent(id)}`;
  return {
    list: (query, signal) =>
      http.get('/branches', branchSchema.array(), {
        query: { status: query?.status },
        ...withSignal(signal),
      }),
    get: (id, signal) => http.get(path(id), branchSchema, withSignal(signal)),
    create: (input) => http.post('/branches', branchSchema, { body: input }),
    update: (id, input) => http.patch(path(id), branchSchema, { body: input }),
    deactivate: (id) => http.post(`${path(id)}/deactivate`, branchSchema),
    activate: (id) => http.post(`${path(id)}/activate`, branchSchema),
    getSettings: (id, signal) =>
      http.get(`${path(id)}/settings`, branchSettingsSchema, withSignal(signal)),
    updateSettings: (id, input) =>
      http.put(`${path(id)}/settings`, branchSettingsSchema, { body: input }),
  };
}
