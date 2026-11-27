import { describe, expect, it } from 'vitest';

import { createApiClient } from '../create-api-client';
import { createFakeFetch, tokens } from '../test/fake-api';
import { createMemoryTokenStore } from '../token-store';

const USER = {
  id: '01930000-0000-7000-8000-000000000010',
  username: 'lan',
  fullName: 'Lan',
  phone: null,
  avatarMediaId: null,
  credentialType: 'pin',
  isActive: true,
  isLocked: false,
  lockedUntil: null,
  mustChangePin: true,
  lastLoginAt: null,
  createdAt: '2026-11-27T00:00:00.000Z',
  updatedAt: '2026-11-27T00:00:00.000Z',
  assignments: [],
};

function setup() {
  const fake = createFakeFetch((request) =>
    request.url.includes('/users?')
      ? {
          status: 200,
          body: { data: [USER], meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 } },
        }
      : request.url.endsWith('/roles/r1')
        ? { status: 204 }
        : { status: 200, body: { data: USER } },
  );
  const client = createApiClient({
    baseUrl: 'http://api.test',
    tokenStore: createMemoryTokenStore(tokens('a')),
    fetch: fake.fetchFn,
  });
  return { client, requests: fake.requests };
}

describe('users api', () => {
  it('pages the list with its filters and leaves empty ones out', async () => {
    const { client, requests } = setup();
    const page = await client.users.list({ page: 2, status: 'locked', search: 'lan' });
    expect(page.meta.total).toBe(21);
    expect(page.data[0]?.username).toBe('lan');
    expect(requests[0]?.url).toBe('http://api.test/users?page=2&search=lan&status=locked');
  });

  it('maps account actions to their endpoints', async () => {
    const { client, requests } = setup();
    await client.users.setActive(USER.id, false);
    await client.users.setAssignment(USER.id, { branchId: null, roleId: USER.id });
    await client.users.removeAssignment(USER.id, null);
    await client.users.resetPin(USER.id, '482913');
    await client.users.unlock(USER.id);
    expect(requests.map((request) => `${request.method} ${request.url.slice(15)}`)).toEqual([
      `POST /users/${USER.id}/disable`,
      `PUT /users/${USER.id}/assignments`,
      `DELETE /users/${USER.id}/assignments/all`,
      `POST /users/${USER.id}/reset-pin`,
      `POST /users/${USER.id}/unlock`,
    ]);
    expect(requests[3]?.body).toEqual({ pin: '482913' });
  });
});

describe('roles api', () => {
  it('deletes a group with a 204 answer', async () => {
    const { client, requests } = setup();
    await expect(client.roles.delete('r1')).resolves.toBeUndefined();
    expect(requests[0]?.method).toBe('DELETE');
  });
});
