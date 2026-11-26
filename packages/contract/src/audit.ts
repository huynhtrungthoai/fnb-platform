import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';

/**
 * Actions written to the audit log, `<entity>.<verb>`. The Admin log screen translates and
 * filters by these; each feature adds its own when it records something new.
 */
export const AUDIT_ACTIONS = [
  'branch.create',
  'branch.update',
  'branch.deactivate',
  'branch.activate',
  'branch.settings_update',
  'user.create',
  'user.update',
  'user.disable',
  'user.enable',
  'user.assign_role',
  'user.unassign_role',
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.account_locked',
  'auth.change_pin',
  'auth.change_password',
  'user.reset_pin',
  'user.unlock',
  'approval.grant',
  'media.upload',
  'device.register',
  'device.revoke',
  'device.session_open',
  'role.create',
  'role.update',
  'role.delete',
  'role.restore_default',
  'approval.reject',
] as const satisfies readonly string[];

/** An action written to the audit log. */
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** One audit log row as returned by `GET /audit-logs` (CORE-40). */
export const auditLogSchema = z.object({
  id: z.uuid(),
  occurredAt: z.iso.datetime(),
  /** Who did it; null for actions of the system itself or of an unknown caller (failed login). */
  actorUserId: z.uuid().nullable(),
  actorName: z.string().nullable(),
  branchId: z.uuid().nullable(),
  deviceId: z.uuid().nullable(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  /** State before and after the change; secrets are never stored. */
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  /** Extra facts: reason, approver, target user... */
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ip: z.string().nullable(),
  requestId: z.string().nullable(),
});

/** One audit log row. */
export type AuditLog = z.infer<typeof auditLogSchema>;

/** Filters of `GET /audit-logs` (CORE-41): person, action, entity, time range. */
export const auditLogQuerySchema = paginationQuerySchema.extend({
  actorUserId: z.uuid().optional(),
  /** An exact action (`user.create`) or an entity prefix ending with a dot (`user.`). */
  action: z
    .string()
    .trim()
    .regex(/^[a-z_]+\.([a-z_]+)?$/)
    .optional(),
  entityType: z.string().trim().min(1).max(60).optional(),
  entityId: z.string().trim().min(1).max(60).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  /**
   * `branch` (default): rows of the branch in `X-Branch-Id`. `business`: rows that belong to no
   * branch (permission groups, branches themselves); only for callers assigned to all branches.
   */
  scope: z.enum(['branch', 'business']).default('branch'),
});

/** Filters of `GET /audit-logs`. */
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
