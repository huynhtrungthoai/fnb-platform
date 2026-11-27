import { Controller, Get } from '@nestjs/common';

import { auditLogQuerySchema, auditLogSchema } from '@fnb/contract';

import {
  Auth,
  requireBranchId,
  RequirePermission,
} from '../../common/decorators/access.decorators.js';
import { ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { permissionDenied } from '../rbac/rbac.service.js';
import { AuditService } from './audit.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Paginated } from '../../common/http/pagination.js';
import type { AuditLogRow, AuditLogView } from './audit.service.js';
import type { AuditLog, AuditLogQuery } from '@fnb/contract';

/** Converts a stored row to the response shape. */
export function toAuditLog(row: AuditLogRow, actorName: string | null = null): AuditLog {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    actorUserId: row.actorUserId,
    actorName,
    branchId: row.branchId,
    deviceId: row.deviceId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: row.before ?? null,
    after: row.after ?? null,
    metadata: row.metadata ?? null,
    ip: row.ip,
    requestId: row.requestId,
  };
}

const withName = (row: AuditLogView): AuditLog => toAuditLog(row, row.actorName);

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Audit log of the current branch, or the business-level log for all-branches callers (CORE-41). */
  @RequirePermission('audit.view')
  @ZResponse(auditLogSchema, { isPage: true, summary: 'Search the audit log' })
  @Get()
  async search(
    @Auth() auth: AuthContext,
    @ZQuery(auditLogQuerySchema) query: AuditLogQuery,
  ): Promise<Paginated<AuditLog>> {
    if (query.scope === 'business') {
      // Business-level rows concern every branch, so only an all-branches assignment may read them.
      if (!auth.access.allBranches?.permissions.includes('audit.view')) {
        throw permissionDenied('audit.view');
      }
      return (await this.audit.search(query, null)).map(withName);
    }
    return (await this.audit.search(query, requireBranchId(auth))).map(withName);
  }
}
