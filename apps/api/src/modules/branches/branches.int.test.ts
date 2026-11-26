import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorSchema,
  apiSuccessSchema,
  branchSchema,
  branchSettingsSchema,
  createBranchSchema,
} from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import { assignRole, createBranch, roleIdOf, signInAs } from '../../test/auth-helpers.js';
import { createTestApp } from '../../test/test-app.js';
import { auditLogs } from '../audit/schema.js';
import { BranchesService, nextIsoDate } from './branches.service.js';
import { branchSettings } from './schema.js';

import type { TestSession } from '../../test/auth-helpers.js';
import type { TestApp } from '../../test/test-app.js';

let test: TestApp;
let owner: TestSession;
let branch1: string;
let branch2: string;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
  branch1 = await createBranch(test, 'Q1', 'Chi nhánh Quận 1');
  branch2 = await createBranch(test, 'Q3', 'Chi nhánh Quận 3');
  owner = await signInAs(test, 'owner', null);
});

afterAll(async () => {
  await test.close();
});

const branchBody = apiSuccessSchema(branchSchema);
const branchListBody = apiSuccessSchema(z.array(branchSchema));
const settingsBody = apiSuccessSchema(branchSettingsSchema);
const errorOf = (body: unknown) => apiErrorSchema.parse(body).error;

describe('branch contract', () => {
  it('upper-cases the code and rejects codes that cannot prefix an invoice number', () => {
    expect(createBranchSchema.parse({ code: ' q7 ', name: 'Quận 7' })).toMatchObject({
      code: 'Q7',
      address: null,
      latitude: null,
    });
    for (const code of ['Q', 'QUAN-07', 'TOOLONG1', 'q 1']) {
      expect(createBranchSchema.safeParse({ code, name: 'x' }).success, code).toBe(false);
    }
  });
});

describe('POST /branches', () => {
  it('creates a branch with the default settings and writes a business-level audit row', async () => {
    const id = uuidv7();
    const response = await test.http
      .post('/branches')
      .set(owner.headers())
      .send({
        id,
        code: 'td',
        name: 'Thủ Đức',
        address: '1 Võ Văn Ngân',
        latitude: 10.85,
        longitude: 106.77,
      })
      .expect(201);
    const branch = branchBody.parse(response.body).data;
    expect(branch).toMatchObject({ id, code: 'TD', name: 'Thủ Đức', isActive: true, phone: null });

    const settings = await test.http
      .get(`/branches/${id}/settings`)
      .set(owner.headers())
      .expect(200);
    expect(settingsBody.parse(settings.body).data).toMatchObject({
      timezone: 'Asia/Ho_Chi_Minh',
      openTime: '10:00',
      closeTime: '22:00',
      dayCutoffTime: '00:00',
      taxRatePercent: 0,
      serviceChargePercent: 0,
      bankAccount: null,
      pendingDayCutoffTime: null,
    });

    const [log] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'branch.create'));
    expect(log).toMatchObject({
      actorUserId: owner.userId,
      branchId: null,
      entityType: 'branch',
      entityId: id,
    });
    expect(log?.after).toMatchObject({ code: 'TD' });
  });

  it('refuses a code that is already used', async () => {
    const response = await test.http
      .post('/branches')
      .set(owner.headers())
      .send({ code: 'q1', name: 'Trùng' })
      .expect(409);
    expect(errorOf(response.body)).toMatchObject({
      code: 'BRANCH_CODE_TAKEN',
      params: { code: 'Q1' },
    });
  });

  it('validates the body', async () => {
    const response = await test.http
      .post('/branches')
      .set(owner.headers())
      .send({ code: 'Q', name: '' })
      .expect(400);
    expect(
      errorOf(response.body)
        .issues?.map((issue) => issue.path)
        .sort(),
    ).toEqual(['code', 'name']);
  });

  it('needs the business permission: a branch manager cannot create branches', async () => {
    const manager = await signInAs(test, 'manager', branch1);
    const response = await test.http
      .post('/branches')
      .set(manager.headers(branch1))
      .send({ code: 'NEW', name: 'Mới' })
      .expect(403);
    expect(errorOf(response.body).params).toEqual({ requiredPermission: 'branch.manage' });
    await test.http.post('/branches').send({ code: 'NEW', name: 'Mới' }).expect(401);
  });
});

describe('GET /branches', () => {
  it('shows every branch to an all-branches caller and only assigned branches to others', async () => {
    const all = await test.http.get('/branches').set(owner.headers()).expect(200);
    expect(branchListBody.parse(all.body).data.map((branch) => branch.code)).toEqual(['Q1', 'Q3']);

    const manager = await signInAs(test, 'manager', branch1);
    const mine = await test.http.get('/branches').set(manager.headers()).expect(200);
    expect(branchListBody.parse(mine.body).data.map((branch) => branch.code)).toEqual(['Q1']);

    await test.http.get(`/branches/${branch1}`).set(manager.headers()).expect(200);
    await test.http.get(`/branches/${branch2}`).set(manager.headers()).expect(403);
  });

  it('hides a branch whose own assignment lacks branch.view, even under an all-branches group', async () => {
    const accountant = await signInAs(test, 'accountant', null);
    await assignRole(test, {
      userId: accountant.userId,
      branchId: branch1,
      roleId: await roleIdOf(test, 'cashier'),
    });
    const response = await test.http.get('/branches').set(accountant.headers()).expect(200);
    expect(branchListBody.parse(response.body).data.map((branch) => branch.code)).toEqual(['Q3']);
  });

  it('refuses a caller without branch.view anywhere, and answers 404 for an unknown branch', async () => {
    const cashier = await signInAs(test, 'cashier', branch1);
    await test.http.get('/branches').set(cashier.headers()).expect(403);
    await test.http.get(`/branches/${uuidv7()}`).set(owner.headers()).expect(404);
  });

  it('can list active branches only', async () => {
    await test.http.post(`/branches/${branch2}/deactivate`).set(owner.headers()).expect(200);
    const active = await test.http.get('/branches?status=active').set(owner.headers()).expect(200);
    expect(branchListBody.parse(active.body).data.map((branch) => branch.code)).toEqual(['Q1']);
  });
});

describe('PATCH /branches/:id and activation', () => {
  it('changes only the fields sent and records before and after', async () => {
    const response = await test.http
      .patch(`/branches/${branch1}`)
      .set(owner.headers())
      .send({ name: 'Quận 1 mới', phone: '028 3822 1234' })
      .expect(200);
    expect(branchBody.parse(response.body).data).toMatchObject({
      code: 'Q1',
      name: 'Quận 1 mới',
      phone: '028 3822 1234',
    });

    const [log] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'branch.update'));
    expect(log?.before).toMatchObject({ name: 'Chi nhánh Quận 1' });
    expect(log?.after).toMatchObject({ name: 'Quận 1 mới' });
  });

  it('refuses renaming the code to one in use', async () => {
    const response = await test.http
      .patch(`/branches/${branch1}`)
      .set(owner.headers())
      .send({ code: 'Q3' })
      .expect(409);
    expect(errorOf(response.body).code).toBe('BRANCH_CODE_TAKEN');
  });

  it('deactivates and reactivates a branch, keeping its data', async () => {
    const off = await test.http
      .post(`/branches/${branch1}/deactivate`)
      .set(owner.headers())
      .expect(200);
    expect(branchBody.parse(off.body).data.isActive).toBe(false);
    await expect(test.app.get(BranchesService).assertActive(branch1)).rejects.toMatchObject({
      code: 'BRANCH_INACTIVE',
    });
    await test.http.get(`/branches/${branch1}`).set(owner.headers()).expect(200);

    const on = await test.http
      .post(`/branches/${branch1}/activate`)
      .set(owner.headers())
      .expect(200);
    expect(branchBody.parse(on.body).data.isActive).toBe(true);
    await expect(test.app.get(BranchesService).assertActive(branch1)).resolves.toBeUndefined();

    const manager = await signInAs(test, 'manager', branch1);
    await test.http
      .post(`/branches/${branch1}/deactivate`)
      .set(manager.headers(branch1))
      .expect(403);
  });
});

describe('branch settings', () => {
  it('lets the branch manager edit the settings of that branch only', async () => {
    const manager = await signInAs(test, 'manager', branch1);
    const response = await test.http
      .put(`/branches/${branch1}/settings`)
      .set(manager.headers())
      .send({
        openTime: '09:30',
        taxRatePercent: 8,
        serviceChargePercent: 5.5,
        receipt: { businessName: 'Banhkepchonong', footer: 'Cảm ơn quý khách', address: '' },
        bankAccount: { bankCode: 'VCB', accountNumber: '0123456789', accountName: 'HO KINH DOANH' },
      })
      .expect(200);
    expect(settingsBody.parse(response.body).data).toMatchObject({
      openTime: '09:30',
      closeTime: '22:00',
      taxRatePercent: 8,
      serviceChargePercent: 5.5,
      receipt: {
        businessName: 'Banhkepchonong',
        footer: 'Cảm ơn quý khách',
        address: null,
        taxCode: null,
      },
      bankAccount: { bankCode: 'VCB' },
    });

    const [log] = await test.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'branch.settings_update'));
    expect(log).toMatchObject({ branchId: branch1, actorUserId: manager.userId });

    await test.http
      .put(`/branches/${branch2}/settings`)
      .set(manager.headers())
      .send({ openTime: '08:00' })
      .expect(403);
    const accountant = await signInAs(test, 'accountant', null);
    await test.http.get(`/branches/${branch1}/settings`).set(accountant.headers()).expect(200);
    await test.http
      .put(`/branches/${branch1}/settings`)
      .set(accountant.headers())
      .send({ openTime: '08:00' })
      .expect(403);
  });

  it('rejects malformed times, time zones and percentages', async () => {
    for (const body of [
      { openTime: '25:00' },
      { timezone: 'Mars/Olympus' },
      { taxRatePercent: 101 },
      { taxRatePercent: 7.123 },
      { bankAccount: { bankCode: 'VCB', accountNumber: '12 34', accountName: 'X' } },
    ]) {
      await test.http
        .put(`/branches/${branch1}/settings`)
        .set(owner.headers())
        .send(body)
        .expect(400);
    }
  });

  it('applies a changed day cutoff from the next business day only', async () => {
    const service = test.app.get(BranchesService);
    // 2026-11-26 15:00 in Ho Chi Minh City.
    const today = new Date('2026-11-26T08:00:00Z');

    const changed = await service.updateSettings(branch1, { dayCutoffTime: '04:00' }, today);
    expect(changed).toMatchObject({
      dayCutoffTime: '00:00',
      pendingDayCutoffTime: '04:00',
      pendingDayCutoffFrom: '2026-11-27',
    });
    // Later the same business day the old cutoff is still in force.
    expect(
      (await service.getSettings(branch1, new Date('2026-11-26T16:30:00Z'))).dayCutoffTime,
    ).toBe('00:00');

    // Once the next business day has started, the new cutoff takes over and stays.
    const nextDay = await service.getSettings(branch1, new Date('2026-11-26T17:05:00Z'));
    expect(nextDay).toMatchObject({
      dayCutoffTime: '04:00',
      pendingDayCutoffTime: null,
      pendingDayCutoffFrom: null,
    });
    const [row] = await test.db
      .select()
      .from(branchSettings)
      .where(eq(branchSettings.branchId, branch1));
    expect(row?.dayCutoffTime).toBe('04:00');
  });

  it('drops a pending cutoff when the cutoff in force is chosen again', async () => {
    const service = test.app.get(BranchesService);
    const now = new Date('2026-11-26T08:00:00Z');
    await service.updateSettings(branch1, { dayCutoffTime: '03:00' }, now);
    const reverted = await service.updateSettings(branch1, { dayCutoffTime: '00:00' }, now);
    expect(reverted).toMatchObject({
      dayCutoffTime: '00:00',
      pendingDayCutoffTime: null,
      pendingDayCutoffFrom: null,
    });
    expect(nextIsoDate('2026-12-31')).toBe('2027-01-01');
  });
});
