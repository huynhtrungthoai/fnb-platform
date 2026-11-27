import { auditLogSchema } from '@fnb/contract';

import type { HttpClient } from '../http-client';
import type { AuditLog, AuditLogQuery, Page } from '@fnb/contract';

/** Calls of the `audit` module (CORE-41). The log is read-only. */
export interface AuditApi {
  /** Newest first, of the branch in `X-Branch-Id` or, with `scope: 'business'`, business-level. */
  search(query?: Partial<AuditLogQuery>, signal?: AbortSignal): Promise<Page<AuditLog>>;
}

/** Binds the `audit` calls to an HTTP client. */
export function createAuditApi(http: HttpClient): AuditApi {
  return {
    search: (query, signal) =>
      http.getPage('/audit-logs', auditLogSchema, {
        query: {
          page: query?.page,
          pageSize: query?.pageSize,
          actorUserId: query?.actorUserId,
          action: query?.action,
          entityType: query?.entityType,
          entityId: query?.entityId,
          from: query?.from,
          to: query?.to,
          scope: query?.scope,
        },
        ...(signal ? { signal } : {}),
      }),
  };
}
