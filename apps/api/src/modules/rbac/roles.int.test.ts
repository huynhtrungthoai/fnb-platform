import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorSchema,
  apiSuccessSchema,
  defaultPermissionsOf,
  PERMISSION_CODES,
  permissionInfoSchema,
  roleSchema,
} from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import {
  assignRole,
  createBranch,
  createCustomRole,
  openSession,
  roleIdOf,
  signInAs,
} from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { auditLogs } from '../audit/schema.js';
import { PERMISSIONS_CHANGED_CHANNEL } from './permissions-events.js';

import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';
import type { Redis } from 'ioredis';

let test: TestApp;
let owner: TestSession;
let branch1: string;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  owner = await signInAs(test, 'owner', null);
});

afterAll(async () => {
  await test.close();
});

const roleBody = apiSuccessSchema(roleSchema);
const rolesBody = apiSuccessSchema(z.array(roleSchema));
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;
const NO_LIMITS = { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null };

describe('GET /roles and /permissions', () => {
  it('lists the seven default groups with member counts, and the catalog', async () => {
    await signInAs(test, 'manager', branch1);
    const manager = await signInAs(test, 'manager', branch1);
    const roles = rolesBody.parse(
      (await test.http.get('/roles').set(manager.headers()).expect(200)).body,
    ).data;
    expect(roles).toHaveLength(7);
    const managerRole = roles.find((role) => role.code === 'manager');
    expect(managerRole?.memberCount).toBe(2);
    expect(managerRole?.permissions).toEqual(defaultPermissionsOf('manager'));
    expect(roles.find((role) => role.code === 'owner')?.permissions).toEqual(PERMISSION_CODES);

    const catalog = apiSuccessSchema(z.array(permissionInfoSchema)).parse(
      (await test.http.get('/permissions').set(manager.headers()).expect(200)).body,
    ).data;
    expect(catalog.map((item) => item.code)).toEqual(PERMISSION_CODES);

    const cashier = await signInAs(test, 'cashier', branch1);
    await test.http.get('/roles').set(cashier.headers()).expect(403);
  });
});

describe('custom groups', () => {
  it('creates a group, adding required permissions, and audits it', async () => {
    const response = await test.http
      .post('/roles')
      .set(owner.headers())
      .send({
        name: { vi: 'Thu ngân kiêm kho', en: 'Cashier and stock' },
        permissions: ['user.manage'],
        limits: NO_LIMITS,
      })
      .expect(201);
    const role = roleBody.parse(response.body).data;
    expect(role).toMatchObject({ isSystem: false, code: null, version: 1, memberCount: 0 });
    // `user.manage` requires `user.view`.
    expect(role.permissions).toEqual(['user.view', 'user.manage']);
    const [log] = await test.db.select().from(auditLogs).where(eq(auditLogs.action, 'role.create'));
    expect(log).toMatchObject({ entityId: role.id, branchId: null });
  });

  it('needs role.manage on an all-branches assignment', async () => {
    const manager = await signInAs(test, 'manager', branch1);
    await test.http
      .post('/roles')
      .set(manager.headers(branch1))
      .send({ name: { vi: 'X' }, permissions: [], limits: NO_LIMITS })
      .expect(403);
  });

  it('refuses permissions the caller does not hold, and editing a group the caller belongs to', async () => {
    const admin = await createCustomRole(test, 'Quản trị nhóm', [
      'role.view',
      'role.manage',
      'user.view',
    ]);
    const adminId = uuidv7();
    await assignRole(test, { userId: adminId, branchId: null, roleId: admin });
    const session = await openSession(test, adminId);

    const escalation = await test.http
      .post('/roles')
      .set(session.headers())
      .send({ name: { vi: 'Lén' }, permissions: ['audit.view'], limits: NO_LIMITS })
      .expect(403);
    expect(errorOf(escalation.body)).toMatchObject({
      code: 'ROLE_ESCALATION',
      params: { missingPermissions: ['audit.view'] },
    });

    const own = await test.http
      .patch(`/roles/${admin}`)
      .set(session.headers())
      .send({ permissions: ['role.view'] })
      .expect(409);
    expect(errorOf(own.body).code).toBe('CANNOT_MODIFY_SELF');
  });

  it('clones a group, then deletes it only once nobody is in it', async () => {
    const cashierId = await roleIdOf(test, 'cashier');
    const clone = roleBody.parse(
      (
        await test.http
          .post(`/roles/${cashierId}/clone`)
          .set(owner.headers())
          .send({ name: { vi: 'Thu ngân ca đêm' } })
          .expect(201)
      ).body,
    ).data;
    expect(clone.permissions).toEqual(defaultPermissionsOf('cashier'));
    expect(clone.limits).toMatchObject({ maxDiscountPercent: 10, maxPayOutAmount: 200_000 });

    const member = uuidv7();
    await assignRole(test, { userId: member, branchId: branch1, roleId: clone.id });
    const inUse = await test.http.delete(`/roles/${clone.id}`).set(owner.headers()).expect(409);
    expect(errorOf(inUse.body)).toMatchObject({ code: 'ROLE_IN_USE', params: { count: 1 } });

    await test.http
      .delete(`/users/${member}/assignments/${branch1}`)
      .set(owner.headers())
      .expect(200);
    await test.http.delete(`/roles/${clone.id}`).set(owner.headers()).expect(204);
    await test.http.get(`/roles/${clone.id}`).set(owner.headers()).expect(404);

    const system = await test.http.delete(`/roles/${cashierId}`).set(owner.headers()).expect(409);
    expect(errorOf(system.body).code).toBe('ROLE_IS_SYSTEM');
  });
});

describe('editing default groups', () => {
  it('takes effect at once for members, publishes permissions.changed, and restores defaults', async () => {
    const managerRole = await roleIdOf(test, 'manager');
    const manager = await signInAs(test, 'manager', branch1);
    await test.http.get('/audit-logs').set(manager.headers(branch1)).expect(200);

    const subscriber: Redis = test.redis.duplicate();
    const messages: string[] = [];
    await subscriber.subscribe(PERMISSIONS_CHANGED_CHANNEL);
    subscriber.on('message', (_channel: string, message: string) => messages.push(message));

    const without = defaultPermissionsOf('manager').filter((code) => code !== 'audit.view');
    const edited = roleBody.parse(
      (
        await test.http
          .patch(`/roles/${managerRole}`)
          .set(owner.headers())
          .send({ permissions: without, limits: { ...NO_LIMITS, maxDiscountPercent: 50 } })
          .expect(200)
      ).body,
    ).data;
    expect(edited.version).toBe(2);
    expect(edited.limits.maxDiscountPercent).toBe(50);
    // Same session, next request: the permission is gone.
    await test.http.get('/audit-logs').set(manager.headers(branch1)).expect(403);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(messages.map((message) => JSON.parse(message) as unknown)).toContainEqual({
      userIds: [manager.userId],
    });
    await subscriber.quit();

    const restored = roleBody.parse(
      (
        await test.http
          .post(`/roles/${managerRole}/restore-default`)
          .set(owner.headers())
          .expect(200)
      ).body,
    ).data;
    expect(restored.permissions).toEqual(defaultPermissionsOf('manager'));
    expect(restored.limits.maxDiscountPercent).toBe(100);
    await test.http.get('/audit-logs').set(manager.headers(branch1)).expect(200);

    const actions = (await test.db.select().from(auditLogs)).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['role.update', 'role.restore_default']));
  });

  it('never changes the owner group, and restores only default groups', async () => {
    const ownerRole = await roleIdOf(test, 'owner');
    const deputy = await createCustomRole(test, 'Toàn quyền', PERMISSION_CODES);
    const deputyId = uuidv7();
    await assignRole(test, { userId: deputyId, branchId: null, roleId: deputy });
    const session = await openSession(test, deputyId);
    const locked = await test.http
      .patch(`/roles/${ownerRole}`)
      .set(session.headers())
      .send({ permissions: [] })
      .expect(409);
    expect(errorOf(locked.body).code).toBe('ROLE_LOCKED');

    const custom = await createCustomRole(test, 'Tuỳ chỉnh', []);
    const notSystem = await test.http
      .post(`/roles/${custom}/restore-default`)
      .set(owner.headers())
      .expect(409);
    expect(errorOf(notSystem.body).code).toBe('ROLE_NOT_SYSTEM');
  });
});
