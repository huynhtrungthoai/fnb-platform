import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorSchema,
  apiSuccessSchema,
  authTokensSchema,
  DEVICE_HEADER,
  deviceSchema,
  deviceStaffSchema,
  registeredDeviceSchema,
} from '@fnb/contract';

import { createAccount, createBranch, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { auditLogs } from '../audit/schema.js';
import { nextDeviceCode } from './devices.service.js';
import { devices } from './schema.js';

import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';

let test: TestApp;
let branch1: string;
let branch2: string;
let manager1: TestSession;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  branch2 = await createBranch(test, 'Q3');
  manager1 = await signInAs(test, 'manager', branch1);
});

afterAll(async () => {
  await test.close();
});

const registeredBody = apiSuccessSchema(registeredDeviceSchema);
const tokensBody = apiSuccessSchema(authTokensSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function register(kind: 'pos' | 'handheld' | 'kds' = 'pos', name = 'Quầy 1') {
  const response = await test.http
    .post('/devices')
    .set(manager1.headers(branch1))
    .send({ name, kind, appVersion: '1.0.0' })
    .expect(201);
  return registeredBody.parse(response.body).data;
}

describe('device codes', () => {
  it('numbers devices per branch and kind and never reuses a code', () => {
    expect(nextDeviceCode('Q1', 'pos', [])).toBe('Q1-P01');
    expect(nextDeviceCode('Q1', 'pos', ['Q1-P01', 'Q1-P02', 'Q1-K01'])).toBe('Q1-P03');
    expect(nextDeviceCode('Q1', 'kds', ['Q1-P01', 'Q1-P02', 'Q1-K01'])).toBe('Q1-K02');
  });
});

describe('registration and revocation', () => {
  it('registers a device at the branch of the manager and lists it', async () => {
    const first = await register();
    const second = await register('pos', 'Quầy 2');
    const kds = await register('kds', 'Bếp');
    expect([first.device.code, second.device.code, kds.device.code]).toEqual([
      'Q1-P01',
      'Q1-P02',
      'Q1-K01',
    ]);
    const [row] = await test.db.select().from(devices).where(eq(devices.id, first.device.id));
    expect(row?.tokenHash).not.toBe(first.deviceToken);

    const listed = apiSuccessSchema(z.array(deviceSchema)).parse(
      (await test.http.get('/devices').set(manager1.headers()).expect(200)).body,
    ).data;
    expect(listed.map((device) => device.code)).toEqual(['Q1-K01', 'Q1-P01', 'Q1-P02']);

    // A manager of Q1 cannot register at Q3.
    await test.http
      .post('/devices')
      .set(manager1.headers(branch2))
      .send({ name: 'X', kind: 'pos' })
      .expect(403);
    const cashier = await signInAs(test, 'cashier', branch1);
    await test.http
      .post('/devices')
      .set(cashier.headers(branch1))
      .send({ name: 'X', kind: 'pos' })
      .expect(403);
  });

  it('opens staff sessions by name and PIN; revoking the device ends them at once', async () => {
    const { device, deviceToken } = await register();
    const cashierId = await createAccount(test, {
      username: 'lantn',
      pin: '246810',
      role: { code: 'cashier', branchId: branch1 },
    });
    await createAccount(test, { username: 'other', role: { code: 'cashier', branchId: branch2 } });

    const staff = apiSuccessSchema(z.array(deviceStaffSchema)).parse(
      (await test.http.get('/devices/staff').set(DEVICE_HEADER, deviceToken).expect(200)).body,
    ).data;
    expect(staff.map((item) => item.userId)).toContain(cashierId);
    expect(staff).toHaveLength(2); // the cashier and manager1, not the Q3 cashier
    await test.http.get('/devices/staff').expect(401);

    const wrong = await test.http
      .post('/devices/session')
      .set(DEVICE_HEADER, deviceToken)
      .send({ userId: cashierId, pin: '000000' })
      .expect(401);
    expect(errorOf(wrong.body).code).toBe('INVALID_CREDENTIALS');
    const tokens = tokensBody.parse(
      (
        await test.http
          .post('/devices/session')
          .set(DEVICE_HEADER, deviceToken)
          .send({ userId: cashierId, pin: '246810' })
          .expect(200)
      ).body,
    ).data;
    await test.http.get('/auth/me').set(bearer(tokens.accessToken)).expect(200);
    // The device session only works at the device's branch.
    await test.http
      .get('/auth/me')
      .set({ ...bearer(tokens.accessToken), 'x-branch-id': branch2 })
      .expect(403);

    const revoked = await test.http
      .post(`/devices/${device.id}/revoke`)
      .set(manager1.headers())
      .expect(200);
    expect(apiSuccessSchema(deviceSchema).parse(revoked.body).data.isActive).toBe(false);
    const cut = await test.http.get('/auth/me').set(bearer(tokens.accessToken)).expect(401);
    expect(errorOf(cut.body).code).toBe('TOKEN_EXPIRED');
    await test.http.post('/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    const dead = await test.http.get('/devices/staff').set(DEVICE_HEADER, deviceToken).expect(401);
    expect(errorOf(dead.body).code).toBe('DEVICE_REVOKED');

    // Registering again gives a new code.
    expect((await register()).device.code).toBe('Q1-P02');
    const actions = (await test.db.select().from(auditLogs)).map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining(['device.register', 'device.session_open', 'device.revoke']),
    );
  });

  it('refuses people not assigned at the branch of the device', async () => {
    const { deviceToken } = await register();
    const otherId = await createAccount(test, {
      username: 'other',
      pin: '246810',
      role: { code: 'cashier', branchId: branch2 },
    });
    await test.http
      .post('/devices/session')
      .set(DEVICE_HEADER, deviceToken)
      .send({ userId: otherId, pin: '246810' })
      .expect(403);
  });
});
