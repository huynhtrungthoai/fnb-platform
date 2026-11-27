import { describe, expect, it } from 'vitest';

import { createApiClient } from '../create-api-client';
import { createFakeFetch, tokens } from '../test/fake-api';
import { createMemoryTokenStore } from '../token-store';

describe('devices and audit api', () => {
  it('sends the list filters and the audit search parameters', async () => {
    const fake = createFakeFetch((request) =>
      request.url.includes('/audit-logs')
        ? {
            status: 200,
            body: { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
          }
        : { status: 200, body: { data: [] } },
    );
    const client = createApiClient({
      baseUrl: 'http://api.test',
      tokenStore: createMemoryTokenStore(tokens('a')),
      fetch: fake.fetchFn,
    });
    await client.devices.list({ status: 'all' });
    await client.audit.search({
      action: 'user.',
      scope: 'business',
      from: '2026-11-27T00:00:00.000Z',
    });
    expect(fake.requests.map((request) => request.url)).toEqual([
      'http://api.test/devices?status=all',
      'http://api.test/audit-logs?action=user.&from=2026-11-27T00%3A00%3A00.000Z&scope=business',
    ]);
  });
});
