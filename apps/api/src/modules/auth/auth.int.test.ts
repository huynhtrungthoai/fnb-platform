import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorSchema, apiSuccessSchema, authTokensSchema, meSchema } from '@fnb/contract';

import { createAccount, createBranch } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { auditLogs } from '../audit/schema.js';
import { users } from '../users/schema.js';
import { refreshTokens } from './schema.js';

import type { TestApp } from '../../test/test-app.js';

let test: TestApp;
let branch1: string;
let branch2: string;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  branch2 = await createBranch(test, 'Q3');
});

afterAll(async () => {
  await test.close();
});

const tokensBody = apiSuccessSchema(authTokensSchema);
const meBody = apiSuccessSchema(meSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function login(username: string, secret: string, status = 200) {
  return test.http.post('/auth/login').send({ username, secret }).expect(status);
}

describe('POST /auth/login', () => {
  it('signs a staff member in with username and PIN and returns their permissions per branch', async () => {
    const userId = await createAccount(test, {
      username: 'lantn',
      pin: '246810',
      role: { code: 'manager', branchId: branch1 },
    });
    const tokens = tokensBody.parse((await login('LanTN', '246810')).body).data;
    expect(tokens.mustChangePin).toBe(false);

    const me = meBody.parse(
      (await test.http.get('/auth/me').set(bearer(tokens.accessToken)).expect(200)).body,
    ).data;
    expect(me.user).toMatchObject({ id: userId, username: 'lantn' });
    expect(me.hasAllBranches).toBe(false);
    expect(me.branches.map((item) => item.branch.code)).toEqual(['Q1']);
    expect(me.branches[0]?.permissions).toContain('user.manage');
    expect(me.businessPermissions).toEqual([]);

    const [row] = await test.db.select().from(users).where(eq(users.id, userId));
    expect(row?.lastLoginAt).not.toBeNull();
    const actions = (await test.db.select().from(auditLogs)).map((log) => log.action);
    expect(actions).toContain('auth.login');
  });

  it('gives the same answer for an unknown username and a wrong PIN, and logs both', async () => {
    await createAccount(test, { username: 'lantn', pin: '246810' });
    const unknown = await login('nobody', '246810', 401);
    const wrong = await login('lantn', '111111', 401);
    const { requestId: _a, ...unknownError } = errorOf(unknown.body);
    const { requestId: _b, ...wrongError } = errorOf(wrong.body);
    expect(unknownError).toEqual(wrongError);
    expect(errorOf(wrong.body).code).toBe('INVALID_CREDENTIALS');
    const failures = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'auth.login_failed'));
    expect(failures).toHaveLength(2);
    expect(JSON.stringify(failures)).not.toContain('111111');
  });

  it('signs the super admin in with the password only; its PIN does not open Admin', async () => {
    await createAccount(test, {
      username: 'owner',
      pin: '135790',
      password: 'Owner-pass-2026',
      role: { code: 'owner', branchId: null },
    });
    await login('owner', '135790', 401);
    const tokens = tokensBody.parse((await login('owner', 'Owner-pass-2026')).body).data;
    const me = meBody.parse(
      (await test.http.get('/auth/me').set(bearer(tokens.accessToken)).expect(200)).body,
    ).data;
    expect(me.hasAllBranches).toBe(true);
    expect(me.branches.map((item) => item.branch.code)).toEqual(['Q1', 'Q3']);
    expect(me.businessPermissions).toContain('branch.manage');
    expect(branch2).toBeTruthy();
  });

  it('refuses a disabled account once the PIN is right', async () => {
    const userId = await createAccount(test, { username: 'lantn', pin: '246810' });
    await test.db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    await login('lantn', '000001', 401);
    expect(errorOf((await login('lantn', '246810', 403)).body).code).toBe('ACCOUNT_DISABLED');
  });

  it('flags a temporary PIN', async () => {
    await createAccount(test, { username: 'newbie', pin: '123456', mustChangePin: true });
    expect(tokensBody.parse((await login('newbie', '123456')).body).data.mustChangePin).toBe(true);
  });
});

describe('refresh and logout', () => {
  it('rotates the refresh token and ends the session when a spent token comes back', async () => {
    await createAccount(test, { username: 'lantn', pin: '246810' });
    const first = tokensBody.parse((await login('lantn', '246810')).body).data;

    const second = tokensBody.parse(
      (await test.http.post('/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200))
        .body,
    ).data;
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await test.http.get('/auth/me').set(bearer(second.accessToken)).expect(200);

    // Replaying the spent token: treated as stolen, the whole session ends.
    const replay = await test.http
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    expect(errorOf(replay.body).code).toBe('UNAUTHENTICATED');
    await test.http.post('/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);
    const cut = await test.http.get('/auth/me').set(bearer(second.accessToken)).expect(401);
    expect(errorOf(cut.body).code).toBe('TOKEN_EXPIRED');

    const rows = await test.db.select().from(refreshTokens);
    expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(first.refreshToken);
  });

  it('logout ends the session; logout-all ends every session of the caller', async () => {
    await createAccount(test, { username: 'lantn', pin: '246810' });
    const a = tokensBody.parse((await login('lantn', '246810')).body).data;
    const b = tokensBody.parse((await login('lantn', '246810')).body).data;

    await test.http.post('/auth/logout').set(bearer(a.accessToken)).expect(204);
    await test.http.get('/auth/me').set(bearer(a.accessToken)).expect(401);
    await test.http.post('/auth/refresh').send({ refreshToken: a.refreshToken }).expect(401);
    await test.http.get('/auth/me').set(bearer(b.accessToken)).expect(200);

    const c = tokensBody.parse((await login('lantn', '246810')).body).data;
    await test.http.post('/auth/logout-all').set(bearer(c.accessToken)).expect(204);
    await test.http.get('/auth/me').set(bearer(b.accessToken)).expect(401);
    await test.http.post('/auth/refresh').send({ refreshToken: b.refreshToken }).expect(401);
  });

  it('a disabled account cannot refresh', async () => {
    const userId = await createAccount(test, { username: 'lantn', pin: '246810' });
    const tokens = tokensBody.parse((await login('lantn', '246810')).body).data;
    await test.db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    await test.http.post('/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });
});
