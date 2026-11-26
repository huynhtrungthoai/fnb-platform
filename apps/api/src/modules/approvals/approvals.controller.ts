import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import {
  approvalSchema,
  approverSchema,
  approversQuerySchema,
  createApprovalSchema,
} from '@fnb/contract';

import { Auth, Authenticated, requireBranchId } from '../../common/decorators/access.decorators.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';
import { ZBody, ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { ApprovalsService } from './approvals.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Approval, Approver, ApproversQuery, CreateApproval } from '@fnb/contract';

/**
 * On-the-spot approval (CORE-24). Any signed-in person working at the branch may ask; the
 * approver's permission and PIN are what is checked.
 */
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Authenticated()
  @ZResponse(approverSchema.array(), { summary: 'Who may approve this permission here' })
  @Get('approvers')
  approvers(
    @Auth() auth: AuthContext,
    @ZQuery(approversQuerySchema) query: ApproversQuery,
  ): Promise<Approver[]> {
    return this.approvals.listApprovers(query.permission, requireBranchId(auth), auth.userId);
  }

  @Authenticated()
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @ZResponse(approvalSchema, {
    summary: 'Approve with the approver PIN; returns a single-use token',
  })
  @Post()
  create(
    @Auth() auth: AuthContext,
    @ZBody(createApprovalSchema) body: CreateApproval,
  ): Promise<Approval> {
    return this.approvals.grant(body, requireBranchId(auth), auth.userId);
  }
}
