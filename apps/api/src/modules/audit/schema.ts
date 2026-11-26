import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { primaryId, timestamptz } from '../../db/columns.js';

/**
 * Audit log (CORE-40): who did what, when, at which branch and device, with the data before
 * and after. Append-only: the service has no update or delete, and a database trigger refuses both.
 * `branch_id` is null for business-level actions (permission groups, branches themselves).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: primaryId(),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
    actorUserId: uuid('actor_user_id'),
    branchId: uuid('branch_id'),
    deviceId: uuid('device_id'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    before: jsonb('before').$type<unknown>(),
    after: jsonb('after').$type<unknown>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ip: text('ip'),
    requestId: text('request_id'),
  },
  (table) => [
    index('audit_logs_branch_time_idx').on(table.branchId, table.occurredAt.desc()),
    index('audit_logs_actor_time_idx').on(table.actorUserId, table.occurredAt.desc()),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  ],
);
