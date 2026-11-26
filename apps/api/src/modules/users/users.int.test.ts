import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  apiErrorSchema,
  apiPageSchema,
  apiSuccessSchema,
  createUserSchema,
  PERMISSION_CODES,
  userAccessSchema,
  userWithAssignmentsSchema,
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
import { CredentialHasher } from './credential-hasher.js';
import { users } from './schema.js';

import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';
import type { CreateUserInput } from '@fnb/contract';

let test: TestApp;
let owner: TestSession;
let manager1: TestSession;
let branch1: string;
let branch2: string;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  branch2 = await createBranch(test, 'Q3');
  owner = await signInAs(test, 'owner', null);
  manager1 = await signInAs(test, 'manager', branch1);
});

afterAll(async () => {
  await test.close();
});

const userBody = apiSuccessSchema(userWithAssignmentsSchema);
const userPage = apiPageSchema(userWithAssignmentsSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;

async function createUser(
  session: TestSession,
  input: Partial<CreateUserInput> & Pick<CreateUserInput, 'assignments'>,
  status = 201,
) {
  return test.http
    .post('/users')
    .set(session.headers())
    .send({
      fullName: 'Nguyễn Văn A',
      username: `nv${Date.now() % 1_000_000}`,
      pin: '123456',
      ...input,
    })
    .expect(status);
}

describe('user contract', () => {
  it('lower-cases usernames and rejects accents, short names and non-six-digit PINs', () => {
    const base = {
      fullName: 'A',
      pin: '000000',
      assignments: [{ branchId: null, roleId: uuidv7() }],
    };
    expect(createUserSchema.parse({ ...base, username: ' LanTN ' }).username).toBe('lantn');
    for (const username of ['ab', 'lân', 'lan.tn', 'a'.repeat(31)]) {
      expect(createUserSchema.safeParse({ ...base, username }).success, username).toBe(false);
    }
    for (const pin of ['12345', '1234567', 'abcdef']) {
      expect(createUserSchema.safeParse({ ...base, username: 'lan', pin }).success, pin).toBe(
        false,
      );
    }
    const twice = {
      ...base,
      username: 'lan',
      assignments: [base.assignments[0], base.assignments[0]],
    };
    expect(createUserSchema.safeParse(twice).success).toBe(false);
  });
});

describe('POST /users', () => {
  it('creates an account with a hashed temporary PIN and its assignments, and audits it', async () => {
    const cashier = await roleIdOf(test, 'cashier');
    const response = await createUser(owner, {
      username: 'LanTN',
      phone: '0901 234 567',
      assignments: [
        { branchId: branch1, roleId: cashier },
        { branchId: branch2, roleId: await roleIdOf(test, 'manager') },
      ],
    });
    const user = userBody.parse(response.body).data;
    expect(user).toMatchObject({
      username: 'lantn',
      credentialType: 'pin',
      mustChangePin: true,
      isActive: true,
      isLocked: false,
    });
    expect(user.assignments.map((item) => item.branch?.code)).toEqual(['Q1', 'Q3']);
    expect(JSON.stringify(response.body)).not.toContain('123456');

    const [row] = await test.db.select().from(users).where(eq(users.id, user.id));
    expect(row?.pinHash).toMatch(/^\$argon2id\$/);
    expect(await test.app.get(CredentialHasher).verify(row?.pinHash, '123456')).toBe(true);

    const [log] = await test.db.select().from(auditLogs).where(eq(auditLogs.action, 'user.create'));
    expect(log).toMatchObject({ entityId: user.id, actorUserId: owner.userId, branchId: null });
    expect(JSON.stringify(log?.after)).not.toContain('argon2');
  });

  it('refuses a username that is taken', async () => {
    const assignments = [{ branchId: branch1, roleId: await roleIdOf(test, 'staff') }];
    await createUser(owner, { username: 'lan', assignments });
    const response = await createUser(owner, { username: 'LAN', assignments }, 409);
    expect(errorOf(response.body)).toMatchObject({ code: 'USERNAME_TAKEN' });
  });

  it('lets a branch manager create staff at that branch only, and never above their own permissions', async () => {
    const staff = await roleIdOf(test, 'staff');
    const created = await createUser(manager1, {
      assignments: [{ branchId: branch1, roleId: staff }],
    });
    const [log] = await test.db.select().from(auditLogs).where(eq(auditLogs.action, 'user.create'));
    expect(log?.branchId).toBe(branch1);
    expect(userBody.parse(created.body).data.assignments).toHaveLength(1);

    const elsewhere = await createUser(
      manager1,
      { assignments: [{ branchId: branch2, roleId: staff }] },
      403,
    );
    expect(errorOf(elsewhere.body)).toMatchObject({ code: 'PERMISSION_DENIED' });
    const allBranches = await createUser(
      manager1,
      { assignments: [{ branchId: null, roleId: staff }] },
      403,
    );
    expect(errorOf(allBranches.body)).toMatchObject({ code: 'PERMISSION_DENIED' });

    const asOwner = await createUser(
      manager1,
      { assignments: [{ branchId: branch1, roleId: await roleIdOf(test, 'owner') }] },
      403,
    );
    expect(errorOf(asOwner.body)).toMatchObject({ code: 'ROLE_ESCALATION' });
  });

  it('refuses to hand out a permission the caller does not hold at the branch', async () => {
    const lead = await createCustomRole(test, 'Trưởng ca', [
      'user.view',
      'user.manage',
      'role.view',
      'role.assign',
    ]);
    const auditor = await createCustomRole(test, 'Xem nhật ký', ['audit.view']);
    const leadId = uuidv7();
    await assignRole(test, { userId: leadId, branchId: branch1, roleId: lead });
    const session = await openSession(test, leadId);
    const response = await createUser(
      session,
      { assignments: [{ branchId: branch1, roleId: auditor }] },
      403,
    );
    expect(errorOf(response.body)).toMatchObject({
      code: 'ROLE_ESCALATION',
      params: { missingPermissions: ['audit.view'] },
    });
  });

  it('refuses callers without user.manage', async () => {
    const cashier = await signInAs(test, 'cashier', branch1);
    const staff = await roleIdOf(test, 'staff');
    const response = await createUser(
      cashier,
      { assignments: [{ branchId: branch1, roleId: staff }] },
      403,
    );
    expect(errorOf(response.body)).toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('GET /users', () => {
  it('shows a branch manager only the staff of their branches and hides the owner', async () => {
    const staff = await roleIdOf(test, 'staff');
    await createUser(owner, {
      username: 'atq1',
      assignments: [{ branchId: branch1, roleId: staff }],
    });
    await createUser(owner, {
      username: 'atq3',
      assignments: [{ branchId: branch2, roleId: staff }],
    });
    await createUser(owner, {
      username: 'both',
      assignments: [
        { branchId: branch1, roleId: staff },
        { branchId: branch2, roleId: staff },
      ],
    });

    const asManager = userPage.parse(
      (await test.http.get('/users').set(manager1.headers()).expect(200)).body,
    );
    const names = asManager.data.map((user) => user.username);
    expect(names).toEqual(expect.arrayContaining(['atq1', 'both']));
    expect(names).not.toContain('atq3');
    expect(asManager.data.some((user) => user.id === owner.userId)).toBe(false);
    // Only the branch the manager reaches is listed next to a user working at two branches.
    const both = asManager.data.find((user) => user.username === 'both');
    expect(both?.assignments.map((item) => item.branch?.code)).toEqual(['Q1']);

    const asOwner = userPage.parse(
      (await test.http.get('/users').set(owner.headers()).expect(200)).body,
    );
    expect(asOwner.meta.total).toBe(5);

    const filtered = userPage.parse(
      (
        await test.http
          .get('/users')
          .query({ branchId: branch2, search: 'ATQ' })
          .set(owner.headers())
          .expect(200)
      ).body,
    );
    expect(filtered.data.map((user) => user.username)).toEqual(['atq3']);

    const hidden = asOwner.data.find((user) => user.username === 'atq3');
    await test.http
      .get(`/users/${hidden?.id ?? ''}`)
      .set(manager1.headers())
      .expect(404);
  });
});

describe('PATCH, disable and enable', () => {
  it('updates the profile and disabling ends every session at once', async () => {
    const target = await signInAs(test, 'staff', branch1);
    await test.http.get('/users').set(target.headers()).expect(403);

    const patched = await test.http
      .patch(`/users/${target.userId}`)
      .set(manager1.headers())
      .send({ fullName: 'Trần Thị B', phone: null })
      .expect(200);
    expect(userBody.parse(patched.body).data.fullName).toBe('Trần Thị B');

    const disabled = await test.http
      .post(`/users/${target.userId}/disable`)
      .set(manager1.headers())
      .expect(200);
    expect(userBody.parse(disabled.body).data.isActive).toBe(false);
    const revoked = await test.http.get('/users').set(target.headers()).expect(401);
    expect(errorOf(revoked.body)).toMatchObject({ code: 'TOKEN_EXPIRED' });

    const enabled = await test.http
      .post(`/users/${target.userId}/enable`)
      .set(manager1.headers())
      .expect(200);
    expect(userBody.parse(enabled.body).data.isActive).toBe(true);

    const actions = (await test.db.select().from(auditLogs)).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['user.update', 'user.disable', 'user.enable']));
  });

  it('protects the owner: managers cannot reach it, nobody disables themselves or the last owner', async () => {
    await test.http.post(`/users/${owner.userId}/disable`).set(manager1.headers()).expect(404);
    const self = await test.http
      .post(`/users/${manager1.userId}/disable`)
      .set(manager1.headers())
      .expect(409);
    expect(errorOf(self.body)).toMatchObject({ code: 'CANNOT_MODIFY_SELF' });

    // A custom group with every permission covers the owner, but the last owner must stay.
    const everything = await createCustomRole(test, 'Toàn quyền', PERMISSION_CODES);
    const deputyId = uuidv7();
    await assignRole(test, { userId: deputyId, branchId: null, roleId: everything });
    const deputy = await openSession(test, deputyId);
    const last = await test.http
      .post(`/users/${owner.userId}/disable`)
      .set(deputy.headers())
      .expect(409);
    expect(errorOf(last.body)).toMatchObject({ code: 'LAST_OWNER' });
    const unassign = await test.http
      .delete(`/users/${owner.userId}/assignments/all`)
      .set(deputy.headers())
      .expect(409);
    expect(errorOf(unassign.body)).toMatchObject({ code: 'LAST_OWNER' });

    // With a second owner, one owner may disable the other; its sessions end at once.
    const secondOwner = await signInAs(test, 'owner', null);
    await test.http.post(`/users/${owner.userId}/disable`).set(secondOwner.headers()).expect(200);
    const revoked = await test.http.get('/users').set(owner.headers()).expect(401);
    expect(errorOf(revoked.body)).toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('nobody acts on a colleague who holds more permissions at the branch', async () => {
    const lead = await createCustomRole(test, 'Trưởng ca', ['user.view', 'user.manage']);
    const leadId = uuidv7();
    await assignRole(test, { userId: leadId, branchId: branch1, roleId: lead });
    const session = await openSession(test, leadId);
    const response = await test.http
      .post(`/users/${manager1.userId}/disable`)
      .set(session.headers())
      .expect(403);
    expect(errorOf(response.body)).toMatchObject({ code: 'ROLE_ESCALATION' });
  });
});

describe('assignments', () => {
  it('sets, replaces and removes the group at a branch and shows effective access', async () => {
    const target = await signInAs(test, 'staff', branch1);
    const cashier = await roleIdOf(test, 'cashier');

    const replaced = await test.http
      .put(`/users/${target.userId}/assignments`)
      .set(manager1.headers())
      .send({ branchId: branch1, roleId: cashier })
      .expect(200);
    expect(userBody.parse(replaced.body).data.assignments[0]?.role.code).toBe('cashier');
    // The cache was dropped: the new group applies to the next request.
    await test.http.get('/branches').set(target.headers()).expect(403);

    await test.http
      .put(`/users/${target.userId}/assignments`)
      .set(owner.headers())
      .send({ branchId: branch2, roleId: await roleIdOf(test, 'manager') })
      .expect(200);
    const access = userAccessSchema.parse(
      (await test.http.get(`/users/${target.userId}/access`).set(owner.headers()).expect(200)).body
        .data,
    );
    expect(access.allBranches).toBeNull();
    const q3 = access.branches.find((item) => item.branch?.code === 'Q3');
    expect(q3?.permissions).toContain('user.manage');
    const q1 = access.branches.find((item) => item.branch?.code === 'Q1');
    expect(q1?.role.code).toBe('cashier');
    expect(q1?.permissions).not.toContain('user.manage');

    // The manager of Q1 only sees Q1 in the access view.
    const asManager = userAccessSchema.parse(
      (await test.http.get(`/users/${target.userId}/access`).set(manager1.headers()).expect(200))
        .body.data,
    );
    expect(asManager.branches.map((item) => item.branch?.code)).toEqual(['Q1']);

    // Not at Q3: the manager has no role.assign there.
    await test.http
      .delete(`/users/${target.userId}/assignments/${branch2}`)
      .set(manager1.headers())
      .expect(403);
    const removed = await test.http
      .delete(`/users/${target.userId}/assignments/${branch2}`)
      .set(owner.headers())
      .expect(200);
    expect(userBody.parse(removed.body).data.assignments.map((item) => item.branch?.code)).toEqual([
      'Q1',
    ]);
    await test.http
      .delete(`/users/${target.userId}/assignments/${branch2}`)
      .set(owner.headers())
      .expect(404);

    const actions = (await test.db.select().from(auditLogs)).map((row) => row.action);
    expect(actions.filter((action) => action === 'user.assign_role')).toHaveLength(2);
    expect(actions).toContain('user.unassign_role');
  });

  it('refuses self-assignment', async () => {
    const response = await test.http
      .put(`/users/${manager1.userId}/assignments`)
      .set(manager1.headers())
      .send({ branchId: branch1, roleId: await roleIdOf(test, 'staff') })
      .expect(409);
    expect(errorOf(response.body)).toMatchObject({ code: 'CANNOT_MODIFY_SELF' });
  });
});
