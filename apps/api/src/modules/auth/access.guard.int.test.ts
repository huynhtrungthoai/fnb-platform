import { Controller, Get, Module } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorSchema } from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import { RequestContext } from '../../common/context/request-context.js';
import {
  Auth,
  Authenticated,
  Public,
  RequirePermission,
} from '../../common/decorators/access.decorators.js';
import {
  assignRole,
  createBranch,
  createCustomRole,
  openSession,
  roleIdOf,
  signInAs,
} from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { RbacService } from '../rbac/rbac.service.js';
import { rolePermissions } from '../rbac/schema.js';
import { SessionStore } from './session/session-store.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { TestApp } from '../../test/test-app.js';

@Controller('probe')
class ProbeController {
  @Get('undeclared')
  undeclared() {
    return { reached: true };
  }

  @Public()
  @Get('public')
  open() {
    return { reached: true };
  }

  @Authenticated()
  @Get('me')
  me(@Auth() auth: AuthContext) {
    return {
      userId: auth.userId,
      branchId: auth.branchId ?? null,
      contextUserId: RequestContext.get()?.userId ?? null,
      contextBranchId: RequestContext.get()?.branchId ?? null,
    };
  }

  @RequirePermission('user.view')
  @Get('staff')
  staff(@Auth() auth: AuthContext) {
    return { branchId: auth.branchId, role: auth.effective?.roleCode ?? null };
  }

  @RequirePermission('branch.manage')
  @Get('business')
  business() {
    return { reached: true };
  }

  @RequirePermission('branch.view', { branch: 'any' })
  @Get('branches')
  anyBranch(@Auth() auth: AuthContext) {
    return { branchId: auth.branchId ?? null };
  }

  @RequirePermission('branch.settings', { branch: { param: 'id' } })
  @Get('branches/:id/settings')
  byParam(@Auth() auth: AuthContext) {
    return { branchId: auth.branchId };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

let BRANCH_1: string;
let BRANCH_2: string;
let test: TestApp;

beforeAll(async () => {
  test = await createTestApp({ imports: [ProbeModule] });
});

beforeEach(async () => {
  await test.reset();
  BRANCH_1 = await createBranch(test, 'B1');
  BRANCH_2 = await createBranch(test, 'B2');
});

afterAll(async () => {
  await test.close();
});

const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;

describe('default deny', () => {
  it('refuses an endpoint that declares no access rule, even for the owner', async () => {
    const owner = await signInAs(test, 'owner', null);
    const response = await test.http
      .get('/probe/undeclared')
      .set(owner.headers(BRANCH_1))
      .expect(403);
    expect(errorOf(response.body).code).toBe('PERMISSION_DENIED');
    await test.http.get('/probe/undeclared').expect(403);
  });

  it('lets anyone reach a public endpoint', async () => {
    await test.http.get('/probe/public').expect(200);
    await test.http.get('/health').expect(200);
  });
});

describe('authentication', () => {
  it('needs a bearer token', async () => {
    const response = await test.http.get('/probe/me').expect(401);
    expect(errorOf(response.body).code).toBe('UNAUTHENTICATED');
    const garbage = await test.http
      .get('/probe/me')
      .set('authorization', 'Bearer not.a.token')
      .expect(401);
    expect(errorOf(garbage.body).code).toBe('UNAUTHENTICATED');
  });

  it('accepts a valid token and exposes the caller to the handler and the request context', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    const response = await test.http.get('/probe/me').set(manager.headers(BRANCH_1)).expect(200);
    expect(response.body).toEqual({
      data: {
        userId: manager.userId,
        branchId: BRANCH_1,
        contextUserId: manager.userId,
        contextBranchId: BRANCH_1,
      },
    });
  });

  it('answers TOKEN_EXPIRED for an expired token and for a revoked session', async () => {
    const userId = uuidv7();
    const expired = await openSession(test, userId, { ttlSeconds: -10 });
    const first = await test.http.get('/probe/me').set(expired.headers()).expect(401);
    expect(errorOf(first.body).code).toBe('TOKEN_EXPIRED');

    const live = await openSession(test, userId);
    await test.http.get('/probe/me').set(live.headers()).expect(200);
    await test.app.get(SessionStore).revoke(live.sessionId, userId);
    const second = await test.http.get('/probe/me').set(live.headers()).expect(401);
    expect(errorOf(second.body).code).toBe('TOKEN_EXPIRED');
  });

  it('ends every session of a user at once', async () => {
    const userId = uuidv7();
    const a = await openSession(test, userId);
    const b = await openSession(test, userId);
    expect(await test.app.get(SessionStore).revokeAllOfUser(userId)).toBe(2);
    await test.http.get('/probe/me').set(a.headers()).expect(401);
    await test.http.get('/probe/me').set(b.headers()).expect(401);
  });

  it('refuses a branch the caller is not assigned to, even on a signed-in-only endpoint', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await test.http.get('/probe/me').set(manager.headers(BRANCH_2)).expect(403);
    await test.http.get('/probe/me').set(manager.headers()).expect(200);
  });
});

describe('branch permissions', () => {
  it('allows the permission only at the branch where the group is assigned', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    const ok = await test.http.get('/probe/staff').set(manager.headers(BRANCH_1)).expect(200);
    expect(ok.body).toEqual({ data: { branchId: BRANCH_1, role: 'manager' } });

    const wrongBranch = await test.http
      .get('/probe/staff')
      .set(manager.headers(BRANCH_2))
      .expect(403);
    expect(errorOf(wrongBranch.body)).toMatchObject({
      code: 'PERMISSION_DENIED',
      params: { requiredPermission: 'user.view' },
    });
  });

  it('answers 403 with the missing permission when the group does not hold it', async () => {
    const cashier = await signInAs(test, 'cashier', BRANCH_1);
    const response = await test.http.get('/probe/staff').set(cashier.headers(BRANCH_1)).expect(403);
    expect(errorOf(response.body).params).toEqual({ requiredPermission: 'user.view' });
  });

  it('needs a branch, and a well-formed one', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    const missing = await test.http.get('/probe/staff').set(manager.headers()).expect(400);
    expect(errorOf(missing.body).code).toBe('BRANCH_REQUIRED');
    const malformed = await test.http
      .get('/probe/staff')
      .set({ ...manager.headers(), 'x-branch-id': 'branch-one' })
      .expect(400);
    expect(errorOf(malformed.body).code).toBe('VALIDATION_FAILED');
  });

  it('applies an all-branches assignment to every branch', async () => {
    const accountant = await signInAs(test, 'accountant', null);
    await test.http.get('/probe/staff').set(accountant.headers(BRANCH_1)).expect(200);
    await test.http.get('/probe/staff').set(accountant.headers(BRANCH_2)).expect(200);
  });

  it('lets a branch-specific assignment win over the all-branches one, without adding them up', async () => {
    const accountant = await signInAs(test, 'accountant', null);
    await assignRole(test, {
      userId: accountant.userId,
      branchId: BRANCH_1,
      roleId: await roleIdOf(test, 'cashier'),
    });
    // Cashier at branch 1: no `user.view` there although the all-branches group has it.
    await test.http.get('/probe/staff').set(accountant.headers(BRANCH_1)).expect(403);
    const other = await test.http.get('/probe/staff').set(accountant.headers(BRANCH_2)).expect(200);
    expect(other.body).toEqual({ data: { branchId: BRANCH_2, role: 'accountant' } });
  });

  it('reads the branch from a route parameter when the endpoint says so', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    const ok = await test.http
      .get(`/probe/branches/${BRANCH_1}/settings`)
      .set(manager.headers())
      .expect(200);
    expect(ok.body).toEqual({ data: { branchId: BRANCH_1 } });
    await test.http.get(`/probe/branches/${BRANCH_2}/settings`).set(manager.headers()).expect(403);
  });

  it('accepts the permission at any branch when the endpoint filters by reach itself', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await test.http.get('/probe/branches').set(manager.headers()).expect(200);
    const cashier = await signInAs(test, 'cashier', BRANCH_1);
    await test.http.get('/probe/branches').set(cashier.headers()).expect(403);
  });
});

describe('business permissions', () => {
  it('only count on an all-branches assignment', async () => {
    const owner = await signInAs(test, 'owner', null);
    await test.http.get('/probe/business').set(owner.headers()).expect(200);

    // A custom group with the business permission ticked, assigned at one branch only.
    const userId = uuidv7();
    const roleId = await createCustomRole(test, 'Quản lý mở rộng', [
      'branch.view',
      'branch.manage',
    ]);
    await assignRole(test, { userId, branchId: BRANCH_1, roleId });
    const local = await openSession(test, userId);
    const denied = await test.http.get('/probe/business').set(local.headers(BRANCH_1)).expect(403);
    expect(errorOf(denied.body).params).toEqual({ requiredPermission: 'branch.manage' });

    // The same group on an all-branches assignment works.
    const wideUserId = uuidv7();
    await assignRole(test, { userId: wideUserId, branchId: null, roleId });
    const wide = await openSession(test, wideUserId);
    await test.http.get('/probe/business').set(wide.headers()).expect(200);
  });
});

describe('permission changes', () => {
  it('take effect on the next request of a signed-in session', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await test.http.get('/probe/staff').set(manager.headers(BRANCH_1)).expect(200);

    const roleId = await roleIdOf(test, 'manager');
    await test.db
      .delete(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionCode, 'user.view')),
      );
    // Still cached until the change is announced...
    await test.http.get('/probe/staff').set(manager.headers(BRANCH_1)).expect(200);
    // ...and gone as soon as the group's cache is dropped, with the same access token.
    expect(await test.app.get(RbacService).invalidateRole(roleId)).toEqual([manager.userId]);
    await test.http.get('/probe/staff').set(manager.headers(BRANCH_1)).expect(403);
  });

  it('gives the owner every permission regardless of the rows of the owner group', async () => {
    const owner = await signInAs(test, 'owner', null);
    await test.db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, await roleIdOf(test, 'owner')));
    await test.app.get(RbacService).invalidateUsers([owner.userId]);
    await test.http.get('/probe/staff').set(owner.headers(BRANCH_1)).expect(200);
    await test.http.get('/probe/business').set(owner.headers()).expect(200);
  });
});
