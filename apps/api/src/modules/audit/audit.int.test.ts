import { Controller, Module, Post } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiPageSchema, auditLogSchema } from '@fnb/contract';

import { Authenticated, Public } from '../../common/decorators/access.decorators.js';
import { AppError } from '../../common/errors/app-error.js';
import { createBranch, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { AuditService } from './audit.service.js';
import { Audited } from './audited.interceptor.js';
import { redactSecrets } from './redact.js';
import { auditLogs } from './schema.js';

import type { TestApp } from '../../test/test-app.js';

@Controller('probe-audit')
class ProbeController {
  constructor(private readonly audit: AuditService) {}

  @Authenticated()
  @Audited('widget.update')
  @Post('ok')
  ok() {
    this.audit.describe({
      entityType: 'widget',
      entityId: 'w-1',
      before: { name: 'Old', pinHash: 'abc' },
      after: { name: 'New', pinHash: 'def' },
    });
    this.audit.describe({ metadata: { reason: 'typo', newPin: '123456' } });
    return { ok: true };
  }

  @Authenticated()
  @Audited('widget.delete')
  @Post('fail')
  fail() {
    this.audit.describe({ entityType: 'widget', entityId: 'w-2' });
    throw new AppError('CONFLICT', 'still in use');
  }

  @Public()
  @Post('login-failed')
  async loginFailed() {
    await this.audit.record({
      action: 'auth.login_failed',
      actorUserId: null,
      branchId: null,
      metadata: { username: 'lan' },
    });
    return { ok: true };
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

const pageSchema = apiPageSchema(auditLogSchema);

describe('redactSecrets', () => {
  it('replaces PINs, passwords, hashes and tokens at any depth', () => {
    expect(
      redactSecrets({
        name: 'Lan',
        pin: '123456',
        nested: { passwordHash: 'x', items: [{ refreshToken: 't', ok: 1 }] },
        at: new Date('2026-11-26T00:00:00Z'),
      }),
    ).toEqual({
      name: 'Lan',
      pin: '[redacted]',
      nested: { passwordHash: '[redacted]', items: [{ refreshToken: '[redacted]', ok: 1 }] },
      at: '2026-11-26T00:00:00.000Z',
    });
  });
});

describe('@Audited', () => {
  it('records who, where, what and the data before and after, without secrets', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    const response = await test.http
      .post('/probe-audit/ok')
      .set(manager.headers(BRANCH_1))
      .expect(201);

    const rows = await test.db.select().from(auditLogs);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'widget.update',
      actorUserId: manager.userId,
      branchId: BRANCH_1,
      entityType: 'widget',
      entityId: 'w-1',
      before: { name: 'Old', pinHash: '[redacted]' },
      after: { name: 'New', pinHash: '[redacted]' },
      metadata: { reason: 'typo', newPin: '[redacted]' },
      requestId: response.headers['x-request-id'],
    });
    expect(rows[0]?.ip).toBeTruthy();
    expect(rows[0]?.occurredAt).toBeInstanceOf(Date);
  });

  it('records nothing when the action fails', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await test.http.post('/probe-audit/fail').set(manager.headers(BRANCH_1)).expect(409);
    expect(await test.db.select().from(auditLogs)).toHaveLength(0);
  });
});

describe('AuditService.record', () => {
  it('records an event without a signed-in actor', async () => {
    await test.http.post('/probe-audit/login-failed').expect(201);
    const rows = await test.db.select().from(auditLogs);
    expect(rows[0]).toMatchObject({
      action: 'auth.login_failed',
      actorUserId: null,
      branchId: null,
      metadata: { username: 'lan' },
    });
  });

  it('keeps the log append-only: the database refuses updates and deletes', async () => {
    await test.app.get(AuditService).record({ action: 'widget.create', branchId: BRANCH_1 });
    await expect(
      test.db
        .update(auditLogs)
        .set({ action: 'tampered' })
        .where(eq(auditLogs.action, 'widget.create')),
    ).rejects.toThrow();
    await expect(test.db.delete(auditLogs)).rejects.toThrow();
    expect((await test.db.select().from(auditLogs))[0]?.action).toBe('widget.create');
  });
});

describe('GET /audit-logs', () => {
  async function seedLogs(actorUserId: string): Promise<void> {
    const audit = test.app.get(AuditService);
    await audit.record({
      action: 'user.create',
      entityType: 'user',
      entityId: 'u1',
      branchId: BRANCH_1,
      actorUserId,
    });
    await audit.record({
      action: 'user.disable',
      entityType: 'user',
      entityId: 'u1',
      branchId: BRANCH_1,
      actorUserId: null,
    });
    await audit.record({
      action: 'branch.settings_update',
      entityType: 'branch',
      entityId: BRANCH_1,
      branchId: BRANCH_1,
      actorUserId,
    });
    await audit.record({
      action: 'user.create',
      entityType: 'user',
      entityId: 'u2',
      branchId: BRANCH_2,
      actorUserId,
    });
    await audit.record({
      action: 'role.update',
      entityType: 'role',
      entityId: 'r1',
      branchId: null,
      actorUserId,
    });
  }

  it('lists the log of the current branch only, newest first, with paging', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await seedLogs(manager.userId);

    const response = await test.http
      .get('/audit-logs?pageSize=2')
      .set(manager.headers(BRANCH_1))
      .expect(200);
    const body = pageSchema.parse(response.body);
    expect(body.meta).toMatchObject({ total: 3, totalPages: 2, pageSize: 2 });
    expect(body.data.map((row) => row.action)).toEqual(['branch.settings_update', 'user.disable']);
    expect(body.data.every((row) => row.branchId === BRANCH_1)).toBe(true);
  });

  it('filters by person, action, entity and time', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await seedLogs(manager.userId);
    const actions = async (query: string): Promise<string[]> => {
      const response = await test.http
        .get(`/audit-logs?${query}`)
        .set(manager.headers(BRANCH_1))
        .expect(200);
      return pageSchema.parse(response.body).data.map((row) => row.action);
    };

    expect(await actions(`actorUserId=${manager.userId}`)).toEqual([
      'branch.settings_update',
      'user.create',
    ]);
    expect(await actions('action=user.')).toEqual(['user.disable', 'user.create']);
    expect(await actions('action=user.create')).toEqual(['user.create']);
    expect(await actions('entityType=branch')).toEqual(['branch.settings_update']);
    expect(await actions('entityId=u1')).toEqual(['user.disable', 'user.create']);
    expect(await actions(`to=${encodeURIComponent('2000-01-01T00:00:00Z')}`)).toEqual([]);
    expect(await actions(`from=${encodeURIComponent('2000-01-01T00:00:00+07:00')}`)).toHaveLength(
      3,
    );
    await test.http
      .get('/audit-logs?action=DROP%20TABLE')
      .set(manager.headers(BRANCH_1))
      .expect(400);
  });

  it('needs audit.view at the branch', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await test.http.get('/audit-logs').set(manager.headers(BRANCH_2)).expect(403);
    const cashier = await signInAs(test, 'cashier', BRANCH_1);
    await test.http.get('/audit-logs').set(cashier.headers(BRANCH_1)).expect(403);
    await test.http.get('/audit-logs').expect(401);
  });

  it('shows business-level rows only to an all-branches assignment', async () => {
    const manager = await signInAs(test, 'manager', BRANCH_1);
    await seedLogs(manager.userId);
    await test.http.get('/audit-logs?scope=business').set(manager.headers(BRANCH_1)).expect(403);

    const accountant = await signInAs(test, 'accountant', null);
    const response = await test.http
      .get('/audit-logs?scope=business')
      .set(accountant.headers(BRANCH_1))
      .expect(200);
    expect(pageSchema.parse(response.body).data.map((row) => row.action)).toEqual(['role.update']);
  });
});
