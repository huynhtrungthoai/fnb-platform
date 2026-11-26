import { Controller, Get, Module } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  APPROVAL_HEADER,
  apiErrorSchema,
  apiSuccessSchema,
  approvalSchema,
  approverSchema,
} from '@fnb/contract';

import { Auth, RequirePermission } from '../../common/decorators/access.decorators.js';
import { createAccount, createBranch, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { Audited } from '../audit/audited.interceptor.js';
import { auditLogs } from '../audit/schema.js';
import { users } from '../users/schema.js';
import { IS_APPROVABLE } from './approvals.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';
import type { PermissionCode } from '@fnb/contract';

/** Stands in for a POS action such as voiding an item, until such permissions exist (M3). */
@Controller('test-approval')
class ApprovableController {
  @RequirePermission('audit.view')
  @Audited('test.approved_action')
  @Get()
  run(@Auth() auth: AuthContext): { approvedBy: string | null } {
    return { approvedBy: auth.approval?.approverUserId ?? null };
  }
}

@Module({ controllers: [ApprovableController] })
class ApprovableModule {}

// No M1 permission is approvable; the test marks `audit.view` approvable to exercise the flow.
const APPROVABLE: readonly PermissionCode[] = ['audit.view'];

let test: TestApp;
let branch1: string;
let branch2: string;
let cashier: TestSession;
let managerId: string;

beforeAll(async () => {
  test = await createTestApp({
    imports: [ApprovableModule],
    customize: (builder) =>
      builder
        .overrideProvider(IS_APPROVABLE)
        .useValue((code: PermissionCode) => APPROVABLE.includes(code)),
  });
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1');
  branch2 = await createBranch(test, 'Q3');
  cashier = await signInAs(test, 'cashier', branch1);
  managerId = await createAccount(test, {
    username: 'quanly',
    pin: '135790',
    role: { code: 'manager', branchId: branch1 },
  });
});

afterAll(async () => {
  await test.close();
});

const approvalBody = apiSuccessSchema(approvalSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;

const ask = (pin: string, overrides: Record<string, unknown> = {}, branchId = branch1) =>
  test.http
    .post('/approvals')
    .set(cashier.headers(branchId))
    .send({
      permission: 'audit.view',
      approverUserId: managerId,
      pin,
      reason: 'Khách đổi món',
      ...overrides,
    });

describe('on-the-spot approval', () => {
  it('lists the people who may approve at the branch, by name', async () => {
    await createAccount(test, { username: 'ql2', role: { code: 'manager', branchId: branch2 } });
    const response = await test.http
      .get('/approvals/approvers')
      .query({ permission: 'audit.view' })
      .set(cashier.headers(branch1))
      .expect(200);
    const approvers = apiSuccessSchema(z.array(approverSchema)).parse(response.body).data;
    expect(approvers.map((item) => item.userId)).toEqual([managerId]);
  });

  it('lets the action run once with the approval and logs who approved', async () => {
    await test.http.get('/test-approval').set(cashier.headers(branch1)).expect(403);
    const approval = approvalBody.parse((await ask('135790').expect(201)).body).data;

    const done = await test.http
      .get('/test-approval')
      .set({ ...cashier.headers(branch1), [APPROVAL_HEADER]: approval.token })
      .expect(200);
    expect(done.body).toEqual({ data: { approvedBy: managerId } });

    // Single use.
    const again = await test.http
      .get('/test-approval')
      .set({ ...cashier.headers(branch1), [APPROVAL_HEADER]: approval.token })
      .expect(403);
    expect(errorOf(again.body).code).toBe('APPROVAL_INVALID');

    const [action] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'test.approved_action'));
    expect(action).toMatchObject({ actorUserId: cashier.userId, branchId: branch1 });
    expect(action?.metadata).toMatchObject({
      approval: { approverUserId: managerId, reason: 'Khách đổi món' },
    });
    const [grant] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'approval.grant'));
    expect(JSON.stringify(grant)).not.toContain('135790');
  });

  it('refuses a wrong PIN and counts it towards the approver lockout', async () => {
    expect(errorOf((await ask('000000').expect(401)).body).code).toBe('INVALID_CREDENTIALS');
    const [row] = await test.db.select().from(users).where(eq(users.id, managerId));
    expect(row?.failedAttempts).toBe(1);
  });

  it('refuses approvers without the permission at this branch, other branches and non-approvable permissions', async () => {
    const cashier2 = await createAccount(test, {
      username: 'tn2',
      pin: '111111',
      role: { code: 'cashier', branchId: branch1 },
    });
    await ask('111111', { approverUserId: cashier2 }).expect(403);
    // The manager of Q1 does not hold the permission at Q3; the cashier is not assigned there.
    await ask('135790', {}, branch2).expect(403);
    const notApprovable = await ask('135790', { permission: 'user.manage' }).expect(400);
    expect(errorOf(notApprovable.body).code).toBe('NOT_APPROVABLE');
  });

  it('an approval only works for its own requester', async () => {
    const approval = approvalBody.parse((await ask('135790').expect(201)).body).data;
    const other = await signInAs(test, 'cashier', branch1);
    await test.http
      .get('/test-approval')
      .set({ ...other.headers(branch1), [APPROVAL_HEADER]: approval.token })
      .expect(403);
    // Still usable by the cashier who asked for it.
    await test.http
      .get('/test-approval')
      .set({ ...cashier.headers(branch1), [APPROVAL_HEADER]: approval.token })
      .expect(200);
  });
});
