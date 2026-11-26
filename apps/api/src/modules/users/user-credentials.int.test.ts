import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  apiErrorSchema,
  apiSuccessSchema,
  authTokensSchema,
  changePinSchema,
  MAX_FAILED_ATTEMPTS,
  userWithAssignmentsSchema,
} from '@fnb/contract';

import { ENV } from '../../config/env.js';
import { createAccount, createBranch, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { auditLogs } from '../audit/schema.js';
import { refreshTokens } from '../auth/schema.js';
import { generatePassword, resetOwnerPassword } from './reset-owner-password.js';
import { users } from './schema.js';

import type { Env } from '../../config/env.js';
import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';

let test: TestApp;
let branch1: string;
let manager1: TestSession;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  manager1 = await signInAs(test, 'manager', branch1);
});

afterAll(async () => {
  await test.close();
});

const tokensBody = apiSuccessSchema(authTokensSchema);
const userBody = apiSuccessSchema(userWithAssignmentsSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const login = (username: string, secret: string) =>
  test.http.post('/auth/login').send({ username, secret });

async function failTimes(username: string, times: number): Promise<void> {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await login(username, '999999');
  }
}

describe('lockout after five wrong PINs', () => {
  it('locks a staff account on the fifth wrong PIN until a manager unlocks it', async () => {
    const userId = await createAccount(test, {
      username: 'lantn',
      pin: '246810',
      role: { code: 'cashier', branchId: branch1 },
    });
    await failTimes('lantn', MAX_FAILED_ATTEMPTS - 1);
    // A right PIN before the fifth failure resets the counter.
    expect((await login('lantn', '246810')).status).toBe(200);
    await failTimes('lantn', MAX_FAILED_ATTEMPTS - 1);
    const fifth = await login('lantn', '999999');
    expect(fifth.status).toBe(423);
    expect(errorOf(fifth.body).code).toBe('ACCOUNT_LOCKED');
    // Locked: even the right PIN is refused, and nothing lifts the lock by itself.
    expect(errorOf((await login('lantn', '246810')).body).code).toBe('ACCOUNT_LOCKED');

    const listed = await test.http
      .get('/users')
      .query({ status: 'locked' })
      .set(manager1.headers())
      .expect(200);
    expect(JSON.stringify(listed.body)).toContain(userId);

    const unlocked = await test.http
      .post(`/users/${userId}/unlock`)
      .set(manager1.headers())
      .expect(200);
    expect(userBody.parse(unlocked.body).data.isLocked).toBe(false);
    expect((await login('lantn', '246810')).status).toBe(200);

    const actions = (await test.db.select().from(auditLogs)).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['auth.account_locked', 'user.unlock']));
  });

  it('locks the super admin for 30 minutes, then lets it in again; managers cannot unlock it', async () => {
    const ownerId = await createAccount(test, {
      username: 'owner',
      password: 'Owner-pass-2026',
      role: { code: 'owner', branchId: null },
    });
    await failTimes('owner', MAX_FAILED_ATTEMPTS);
    const locked = await login('owner', 'Owner-pass-2026');
    expect(locked.status).toBe(423);
    expect(errorOf(locked.body).params?.lockedUntil).toBeTypeOf('string');

    // Not even another owner resets or unlocks the super admin account.
    const deputy = await signInAs(test, 'owner', null);
    const refused = await test.http
      .post(`/users/${ownerId}/unlock`)
      .set(deputy.headers())
      .expect(403);
    expect(errorOf(refused.body).code).toBe('ACCOUNT_PROTECTED');

    const past = new Date(Date.now() - 1000);
    await test.db.update(users).set({ lockedUntil: past }).where(eq(users.id, ownerId));
    expect((await login('owner', 'Owner-pass-2026')).status).toBe(200);
    const [row] = await test.db.select().from(users).where(eq(users.id, ownerId));
    expect(row).toMatchObject({ failedAttempts: 0, lockedAt: null });
  });
});

describe('temporary PIN', () => {
  it('only allows changing the PIN until it is changed', async () => {
    await createAccount(test, { username: 'newbie', pin: '123456', mustChangePin: true });
    const temporary = tokensBody.parse((await login('newbie', '123456')).body).data;
    expect(temporary.mustChangePin).toBe(true);

    await test.http.get('/auth/me').set(bearer(temporary.accessToken)).expect(200);
    const blocked = await test.http
      .post('/auth/logout-all')
      .set(bearer(temporary.accessToken))
      .expect(403);
    expect(errorOf(blocked.body).code).toBe('PIN_CHANGE_REQUIRED');

    const same = await test.http
      .post('/auth/change-pin')
      .set(bearer(temporary.accessToken))
      .send({ currentPin: '123456', newPin: '123456' })
      .expect(400);
    expect(errorOf(same.body).code).toBe('VALIDATION_FAILED');

    const fresh = tokensBody.parse(
      (
        await test.http
          .post('/auth/change-pin')
          .set(bearer(temporary.accessToken))
          .send({ currentPin: '123456', newPin: '654321' })
          .expect(200)
      ).body,
    ).data;
    expect(fresh.mustChangePin).toBe(false);
    // The old session ended with the old PIN.
    await test.http.get('/auth/me').set(bearer(temporary.accessToken)).expect(401);
    await test.http.post('/auth/logout-all').set(bearer(fresh.accessToken)).expect(204);
    expect((await login('newbie', '123456')).status).toBe(401);
    expect((await login('newbie', '654321')).status).toBe(200);
  });

  it('counts a wrong current PIN towards the lockout', async () => {
    const userId = await createAccount(test, { username: 'lantn', pin: '246810' });
    const tokens = tokensBody.parse((await login('lantn', '246810')).body).data;
    const wrong = await test.http
      .post('/auth/change-pin')
      .set(bearer(tokens.accessToken))
      .send({ currentPin: '000000', newPin: '111111' })
      .expect(401);
    expect(errorOf(wrong.body).code).toBe('INVALID_CREDENTIALS');
    const [row] = await test.db.select().from(users).where(eq(users.id, userId));
    expect(row?.failedAttempts).toBe(1);
  });

  it('rejects a new PIN equal to the current one in the contract', () => {
    expect(changePinSchema.safeParse({ currentPin: '111111', newPin: '111111' }).success).toBe(
      false,
    );
  });
});

describe('POST /users/:id/reset-pin', () => {
  it('sets a temporary PIN, unlocks, ends every session and is audited', async () => {
    const userId = await createAccount(test, {
      username: 'lantn',
      pin: '246810',
      role: { code: 'cashier', branchId: branch1 },
    });
    const tokens = tokensBody.parse((await login('lantn', '246810')).body).data;
    await failTimes('lantn', MAX_FAILED_ATTEMPTS);

    const reset = await test.http
      .post(`/users/${userId}/reset-pin`)
      .set(manager1.headers())
      .send({ pin: '808080' })
      .expect(200);
    expect(userBody.parse(reset.body).data).toMatchObject({ isLocked: false, mustChangePin: true });
    await test.http.get('/auth/me').set(bearer(tokens.accessToken)).expect(401);
    await test.http.post('/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);

    const fresh = tokensBody.parse((await login('lantn', '808080')).body).data;
    expect(fresh.mustChangePin).toBe(true);

    const [log] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'user.reset_pin'));
    expect(log).toMatchObject({ entityId: userId, branchId: branch1 });
    expect(JSON.stringify(log)).not.toContain('808080');
  });

  it('needs user.reset_credentials and refuses the account of the caller', async () => {
    const cashier = await signInAs(test, 'cashier', branch1);
    await test.http
      .post(`/users/${manager1.userId}/reset-pin`)
      .set(cashier.headers())
      .send({ pin: '123123' })
      .expect(403);
    const self = await test.http
      .post(`/users/${manager1.userId}/reset-pin`)
      .set(manager1.headers())
      .send({ pin: '123123' })
      .expect(409);
    expect(errorOf(self.body).code).toBe('CANNOT_MODIFY_SELF');
  });
});

describe('reset-owner-password command', () => {
  it('sets a new password, unlocks the super admin and revokes its refresh tokens', async () => {
    const ownerId = await createAccount(test, {
      username: 'owner',
      password: 'Owner-pass-2026',
      role: { code: 'owner', branchId: null },
    });
    const tokens = tokensBody.parse((await login('owner', 'Owner-pass-2026')).body).data;
    await test.db
      .update(users)
      .set({ lockedAt: new Date(), lockedUntil: new Date(Date.now() + 60_000) })
      .where(eq(users.id, ownerId));

    const env = test.app.get<Env>(ENV);
    await expect(resetOwnerPassword(test.db, env, 'short')).rejects.toThrow();
    const password = generatePassword();
    expect(await resetOwnerPassword(test.db, env, password)).toEqual({ username: 'owner' });

    expect((await login('owner', 'Owner-pass-2026')).status).toBe(401);
    expect((await login('owner', password)).status).toBe(200);
    const revoked = await test.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, ownerId));
    expect(revoked.some((row) => row.revokedAt !== null)).toBe(true);
    await test.http.post('/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });
});
