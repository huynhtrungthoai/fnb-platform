import { describe, expect, it } from 'vitest';

import { describeTarget, diffFields, isAuditAction } from './audit-format';

import type { AuditLog } from '@fnb/contract';

const ROW: AuditLog = {
  id: '01930000-0000-7000-8000-000000000a01',
  occurredAt: '2026-11-27T03:28:58.710Z',
  actorUserId: null,
  actorName: null,
  branchId: null,
  deviceId: null,
  action: 'role.update',
  entityType: 'role',
  entityId: '01930000-0000-7000-8000-0000000000c1',
  before: { name: { vi: 'Thu ngân ca tối' }, version: 1, permissions: [] },
  after: { name: { vi: 'Thu ngân ca tối' }, version: 2, permissions: ['user.view'] },
  metadata: null,
  ip: null,
  requestId: null,
};

describe('audit format', () => {
  it('recognises the actions it has labels for', () => {
    expect(isAuditAction('role.update')).toBe(true);
    expect(isAuditAction('order.void')).toBe(false);
  });

  it('lists only the fields that changed', () => {
    expect(diffFields(ROW)).toEqual([
      { field: 'version', before: '1', after: '2' },
      { field: 'permissions', before: '[]', after: '["user.view"]' },
    ]);
  });

  it('names the target from the recorded data, else by a short id', () => {
    expect(describeTarget(ROW)).toBe('Thu ngân ca tối');
    expect(describeTarget({ ...ROW, before: null, after: { fullName: 'Lê Hà' } })).toBe('Lê Hà');
    expect(describeTarget({ ...ROW, before: null, after: null })).toBe('role 01930000');
  });
});
