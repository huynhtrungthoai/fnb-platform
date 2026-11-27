import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  apiErrorSchema,
  apiPageSchema,
  apiSuccessSchema,
  auditLogSchema,
  authTokensSchema,
  branchSchema,
  MAX_FAILED_ATTEMPTS,
  meSchema,
  roleSchema,
  userWithAssignmentsSchema,
} from '@fnb/contract';

import { BRANCH_HEADER } from './common/decorators/access.decorators.js';
import { createAccount } from './test/auth-helpers.js';
import { createTestApp } from './test/test-app.js';

import type { TestApp } from './test/test-app.js';
import type { AuthTokens } from '@fnb/contract';
import type { Response } from 'supertest';

/**
 * End-to-end flows of milestone M1 (M1-22), through the HTTP API only, the way Admin and POS use
 * it: real sign-in, real tokens, changes made by one person seen by another on their next request.
 * Module tests cover each rule in detail; these check that the pieces work together.
 */

let test: TestApp;

const OWNER = { username: 'owner', password: 'owner-pass-2026' };

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  await createAccount(test, {
    username: OWNER.username,
    password: OWNER.password,
    role: { code: 'owner', branchId: null },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await test.close();
});

const tokensBody = apiSuccessSchema(authTokensSchema);
const meBody = apiSuccessSchema(meSchema);
const branchBody = apiSuccessSchema(branchSchema);
const branchesBody = apiSuccessSchema(branchSchema.array());
const rolesBody = apiSuccessSchema(roleSchema.array());
const userBody = apiSuccessSchema(userWithAssignmentsSchema);
const usersPage = apiPageSchema(userWithAssignmentsSchema);
const auditPage = apiPageSchema(auditLogSchema);
const errorCode = (response: Response) => apiErrorSchema.parse(response.body).error.code;

async function login(username: string, secret: string): Promise<AuthTokens> {
  const response = await test.http.post('/auth/login').send({ username, secret }).expect(200);
  return tokensBody.parse(response.body).data;
}

const as = (tokens: AuthTokens, branchId?: string) => ({
  authorization: `Bearer ${tokens.accessToken}`,
  ...(branchId ? { [BRANCH_HEADER]: branchId } : {}),
});

async function createBranch(owner: AuthTokens, code: string): Promise<string> {
  const response = await test.http
    .post('/branches')
    .set(as(owner))
    .send({ code, name: `Chi nhánh ${code}` })
    .expect(201);
  return branchBody.parse(response.body).data.id;
}

async function roleId(owner: AuthTokens, code: string): Promise<string> {
  const response = await test.http.get('/roles').set(as(owner)).expect(200);
  const role = rolesBody.parse(response.body).data.find((candidate) => candidate.code === code);
  if (!role) {
    throw new Error(`Default group ${code} is missing`);
  }
  return role.id;
}

async function createStaff(
  owner: AuthTokens,
  values: { username: string; pin: string; branchId: string; roleCode: string },
): Promise<string> {
  const response = await test.http
    .post('/users')
    .set(as(owner))
    .send({
      fullName: values.username,
      username: values.username,
      pin: values.pin,
      assignments: [{ branchId: values.branchId, roleId: await roleId(owner, values.roleCode) }],
    })
    .expect(201);
  return userBody.parse(response.body).data.id;
}

describe('branch-scoped permissions', () => {
  it('a manager set up by the owner works only where assigned, and changes apply at once', async () => {
    const owner = await login(OWNER.username, OWNER.password);
    const branchA = await createBranch(owner, 'QA');
    const branchB = await createBranch(owner, 'QB');
    const managerId = await createStaff(owner, {
      username: 'halequanly',
      pin: '135790',
      branchId: branchA,
      roleCode: 'manager',
    });

    // First sign-in with the temporary PIN: only changing it is allowed.
    const temporary = await login('halequanly', '135790');
    expect(temporary.mustChangePin).toBe(true);
    const blocked = await test.http.get('/users').set(as(temporary, branchA)).expect(403);
    expect(errorCode(blocked)).toBe('PIN_CHANGE_REQUIRED');
    const changed = await test.http
      .post('/auth/change-pin')
      .set(as(temporary))
      .send({ currentPin: '135790', newPin: '246802' })
      .expect(200);
    const manager = tokensBody.parse(changed.body).data;
    expect(manager.mustChangePin).toBe(false);

    // Works at branch A, nowhere else. The audit log is read at the branch of the request.
    await test.http.get('/audit-logs').set(as(manager, branchA)).expect(200);
    expect(errorCode(await test.http.get('/audit-logs').set(as(manager, branchB)))).toBe(
      'PERMISSION_DENIED',
    );
    // Lists that filter by reach answer anywhere, but only with what the caller may see.
    const staffAtB = await test.http
      .get('/users')
      .query({ branchId: branchB })
      .set(as(manager, branchA))
      .expect(200);
    expect(usersPage.parse(staffAtB.body).data).toEqual([]);
    const visible = await test.http.get('/branches').set(as(manager)).expect(200);
    expect(branchesBody.parse(visible.body).data.map((branch) => branch.id)).toEqual([branchA]);
    await test.http.get(`/branches/${branchB}`).set(as(manager)).expect(403);
    // Business-level actions stay with the owner.
    await test.http.post('/branches').set(as(manager)).send({ code: 'QC', name: 'C' }).expect(403);

    // The owner adds branch B as cashier: the same token sees it on the next request.
    await test.http
      .put(`/users/${managerId}/assignments`)
      .set(as(owner))
      .send({ branchId: branchB, roleId: await roleId(owner, 'cashier') })
      .expect(200);
    const me = meBody.parse((await test.http.get('/auth/me').set(as(manager)).expect(200)).body);
    expect(me.data.branches.map((entry) => [entry.branch.code, entry.role.code])).toEqual(
      expect.arrayContaining([
        ['QA', 'manager'],
        ['QB', 'cashier'],
      ]),
    );
    // Permissions do not add up across branches: a cashier at B still cannot read B's log.
    await test.http.get('/audit-logs').set(as(manager, branchB)).expect(403);

    // Removing branch A takes the manager's rights there away at once.
    await test.http.delete(`/users/${managerId}/assignments/${branchA}`).set(as(owner)).expect(200);
    await test.http.get('/audit-logs').set(as(manager, branchA)).expect(403);
    await test.http.get('/users').set(as(manager, branchA)).expect(403);
  });
});

describe('token lifecycle', () => {
  it('expires access tokens, rotates refresh tokens and ends the session on reuse or logout', async () => {
    const owner = await login(OWNER.username, OWNER.password);
    const branch = await createBranch(owner, 'QA');
    await createStaff(owner, {
      username: 'lanthungan',
      pin: '112233',
      branchId: branch,
      roleCode: 'cashier',
    });
    const temporary = await login('lanthungan', '112233');
    const changed = await test.http
      .post('/auth/change-pin')
      .set(as(temporary))
      .send({ currentPin: '112233', newPin: '445566' })
      .expect(200);
    const first = tokensBody.parse(changed.body).data;
    await test.http.get('/auth/me').set(as(first)).expect(200);

    // The access token expires after its TTL; the refresh token still renews the session.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() });
    vi.setSystemTime(Date.parse(first.accessTokenExpiresAt) + 1000);
    expect(errorCode(await test.http.get('/auth/me').set(as(first)))).toBe('TOKEN_EXPIRED');
    const renewed = await test.http
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    const second = tokensBody.parse(renewed.body).data;
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await test.http.get('/auth/me').set(as(second)).expect(200);

    // A spent refresh token coming back means it leaked: the whole session ends.
    await test.http.post('/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
    expect(errorCode(await test.http.get('/auth/me').set(as(second)))).toBe('TOKEN_EXPIRED');
    await test.http.post('/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);

    // A new sign-in works; logout ends that session too.
    const third = await login('lanthungan', '445566');
    await test.http.post('/auth/logout').set(as(third)).send({ refreshToken: third.refreshToken });
    expect(errorCode(await test.http.get('/auth/me').set(as(third)))).toBe('TOKEN_EXPIRED');

    // A refresh token past its lifetime is refused.
    const fourth = await login('lanthungan', '445566');
    vi.setSystemTime(Date.parse(fourth.refreshTokenExpiresAt) + 1000);
    await test.http.post('/auth/refresh').send({ refreshToken: fourth.refreshToken }).expect(401);
  });
});

describe('lockout and unlock', () => {
  it('locks after five wrong PINs, the owner sees and unlocks it, and it is in the log', async () => {
    const owner = await login(OWNER.username, OWNER.password);
    const branch = await createBranch(owner, 'QA');
    const staffId = await createStaff(owner, {
      username: 'minhbep',
      pin: '777888',
      branchId: branch,
      roleCode: 'kitchen',
    });
    const signIn = (secret: string) =>
      test.http.post('/auth/login').send({ username: 'minhbep', secret });

    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      expect(errorCode(await signIn('000000'))).toBe('INVALID_CREDENTIALS');
    }
    const fifth = await signIn('000000');
    expect(fifth.status).toBe(423);
    expect(errorCode(fifth)).toBe('ACCOUNT_LOCKED');
    expect(errorCode(await signIn('777888'))).toBe('ACCOUNT_LOCKED');

    const locked = await test.http
      .get('/users')
      .query({ status: 'locked' })
      .set(as(owner, branch))
      .expect(200);
    expect(usersPage.parse(locked.body).data.map((user) => user.id)).toEqual([staffId]);

    await test.http.post(`/users/${staffId}/unlock`).set(as(owner)).expect(200);
    expect((await signIn('777888')).status).toBe(200);

    // Locked again, then a reset: the old PIN no longer works, the temporary one does.
    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      await signIn('000000');
    }
    await test.http
      .post(`/users/${staffId}/reset-pin`)
      .set(as(owner))
      .send({ pin: '909090' })
      .expect(200);
    expect(errorCode(await signIn('777888'))).toBe('INVALID_CREDENTIALS');
    const reset = tokensBody.parse((await signIn('909090')).body).data;
    expect(reset.mustChangePin).toBe(true);

    // Sign-in events belong to no branch; actions on the account are logged at its branch.
    const readLog = async (scope: 'business' | 'branch') => {
      const response = await test.http
        .get('/audit-logs')
        .query({ scope, entityId: staffId, pageSize: 50 })
        .set(as(owner, branch))
        .expect(200);
      return auditPage.parse(response.body).data;
    };
    const business = await readLog('business');
    const atBranch = await readLog('branch');
    expect(business.map((row) => row.action)).toContain('auth.account_locked');
    expect(atBranch.map((row) => row.action)).toEqual(
      expect.arrayContaining(['user.unlock', 'user.reset_pin']),
    );
    const rows = [...business, ...atBranch];
    const unlock = rows.find((row) => row.action === 'user.unlock');
    expect(unlock?.actorName).toBe(OWNER.username);
    expect(z.uuid().safeParse(unlock?.actorUserId).success).toBe(true);
  });
});
