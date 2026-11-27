import { describe, expect, it } from 'vitest';

import { createApiClient } from '../create-api-client';
import { createFakeFetch, tokens } from '../test/fake-api';
import { createMemoryTokenStore } from '../token-store';

const BRANCH = {
  id: '01930000-0000-7000-8000-0000000000b1',
  code: 'Q1',
  name: 'Quận 1',
  address: null,
  phone: null,
  latitude: null,
  longitude: null,
  isActive: true,
  createdAt: '2026-11-27T00:00:00.000Z',
  updatedAt: '2026-11-27T00:00:00.000Z',
};

function setup() {
  const fake = createFakeFetch((request) => ({
    status: 200,
    body: { data: request.url.endsWith('/branches?status=all') ? [BRANCH] : BRANCH },
  }));
  const client = createApiClient({
    baseUrl: 'http://api.test',
    tokenStore: createMemoryTokenStore(tokens('a')),
    fetch: fake.fetchFn,
    getBranchId: () => BRANCH.id,
  });
  return { client, requests: fake.requests };
}

describe('branches api', () => {
  it('lists with the status filter and parses the rows', async () => {
    const { client, requests } = setup();
    expect(await client.branches.list({ status: 'all' })).toEqual([BRANCH]);
    expect(requests[0]?.url).toBe('http://api.test/branches?status=all');
    expect(requests[0]?.headers['x-branch-id']).toBe(BRANCH.id);
  });

  it('sends each change to its own endpoint', async () => {
    const { client, requests } = setup();
    await client.branches.update(BRANCH.id, { name: 'Quận Một' });
    await client.branches.deactivate(BRANCH.id);
    await client.branches.activate(BRANCH.id);
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      `PATCH http://api.test/branches/${BRANCH.id}`,
      `POST http://api.test/branches/${BRANCH.id}/deactivate`,
      `POST http://api.test/branches/${BRANCH.id}/activate`,
    ]);
    expect(requests[0]?.body).toEqual({ name: 'Quận Một' });
  });
});
