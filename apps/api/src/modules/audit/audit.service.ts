import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, like, lte } from 'drizzle-orm';

import { RequestContext } from '../../common/context/request-context.js';
import { Paginated, toLimitOffset } from '../../common/http/pagination.js';
import { DB } from '../../db/database.js';
import { users } from '../users/schema.js';
import { redactSecrets } from './redact.js';
import { auditLogs } from './schema.js';

import type { Database, Executor } from '../../db/database.js';
import type { AuditLogQuery } from '@fnb/contract';
import type { SQL } from 'drizzle-orm';

/** What a caller says about an action; who, where and from which request are filled in. */
export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  /** Override for actions whose actor is not the request's caller (failed login, system). */
  actorUserId?: string | null;
  /** Override; `null` marks a business-level action even when the request has a branch. */
  branchId?: string | null;
  deviceId?: string | null;
}

/** Details a service attaches to the audit row that `@Audited` writes for the current request. */
export type AuditDetails = Omit<AuditEntry, 'action'>;

/** An audit row as stored. */
export type AuditLogRow = typeof auditLogs.$inferSelect;

/** An audit row with the name of whoever did it, for the log screen. */
export type AuditLogView = AuditLogRow & { actorName: string | null };

/**
 * The only writer of the audit log (CORE-40). Two ways to record:
 *  - `@Audited('user.create')` on the endpoint, with the service calling `describe()` to add
 *    the entity and the before/after data; the row is written once the handler succeeds
 *  - `record()` directly, for events outside that flow (a failed login) or inside a transaction
 */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Adds details to the audit row of the current request. Later calls merge over earlier ones. */
  describe(details: AuditDetails): void {
    const store = RequestContext.get();
    if (store) {
      store.audit = { ...store.audit, ...details };
    }
  }

  /** Writes one row. Pass the transaction to make the log part of the change it describes. */
  async record(entry: AuditEntry, executor: Executor = this.db): Promise<void> {
    const store = RequestContext.get();
    await executor.insert(auditLogs).values({
      action: entry.action,
      actorUserId: entry.actorUserId === undefined ? (store?.userId ?? null) : entry.actorUserId,
      branchId: entry.branchId === undefined ? (store?.branchId ?? null) : entry.branchId,
      deviceId: entry.deviceId === undefined ? (store?.deviceId ?? null) : entry.deviceId,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? null : redactSecrets(entry.before),
      after: entry.after === undefined ? null : redactSecrets(entry.after),
      metadata: entry.metadata ? (redactSecrets(entry.metadata) as Record<string, unknown>) : null,
      ip: store?.ip ?? null,
      requestId: store?.requestId ?? null,
    });
  }

  /**
   * Searches the log, newest first. `branchId` limits the rows to one branch; `null` returns the
   * business-level rows.
   */
  async search(query: AuditLogQuery, branchId: string | null): Promise<Paginated<AuditLogView>> {
    const conditions: SQL[] = [
      branchId === null ? isNull(auditLogs.branchId) : eq(auditLogs.branchId, branchId),
    ];
    if (query.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, query.actorUserId));
    }
    if (query.action) {
      conditions.push(
        query.action.endsWith('.')
          ? like(auditLogs.action, `${query.action.replaceAll('_', '\\_')}%`)
          : eq(auditLogs.action, query.action),
      );
    }
    if (query.entityType) {
      conditions.push(eq(auditLogs.entityType, query.entityType));
    }
    if (query.entityId) {
      conditions.push(eq(auditLogs.entityId, query.entityId));
    }
    if (query.from) {
      conditions.push(gte(auditLogs.occurredAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(auditLogs.occurredAt, new Date(query.to)));
    }
    const where = and(...conditions);
    const { limit, offset } = toLimitOffset(query);

    const [rows, totals] = await Promise.all([
      // Read-only join for display: the log keeps ids, the screen shows who that was.
      this.db
        .select({ row: auditLogs, actorName: users.fullName })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(where)
        .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(auditLogs).where(where),
    ]);
    return new Paginated(
      rows.map(({ row, actorName }) => ({ ...row, actorName })),
      totals[0]?.total ?? 0,
      query,
    );
  }
}
