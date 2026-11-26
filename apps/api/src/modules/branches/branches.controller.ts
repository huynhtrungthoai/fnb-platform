import { Controller, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';

import {
  branchListQuerySchema,
  branchSchema,
  branchSettingsSchema,
  createBranchSchema,
  updateBranchSchema,
  updateBranchSettingsSchema,
} from '@fnb/contract';

import { Auth, RequirePermission } from '../../common/decorators/access.decorators.js';
import { UuidParam, ZBody, ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { branchReach } from '../rbac/access.js';
import { BranchesService } from './branches.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type {
  Branch,
  BranchListQuery,
  BranchSettings,
  CreateBranch,
  UpdateBranch,
  UpdateBranchSettings,
} from '@fnb/contract';

const BY_ID = { branch: { param: 'id' } } as const;

@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  /** Branches where the caller holds `branch.view`. */
  @RequirePermission('branch.view', { branch: 'any' })
  @ZResponse(branchSchema.array(), { summary: 'List the branches the caller may see' })
  @Get()
  list(
    @Auth() auth: AuthContext,
    @ZQuery(branchListQuerySchema) query: BranchListQuery,
  ): Promise<Branch[]> {
    return this.branches.list(branchReach(auth.access, 'branch.view'), query.status === 'active');
  }

  @RequirePermission('branch.manage')
  @Audited('branch.create')
  @ZResponse(branchSchema, { summary: 'Create a branch with default settings' })
  @Post()
  create(
    @Auth() auth: AuthContext,
    @ZBody(createBranchSchema) body: CreateBranch,
  ): Promise<Branch> {
    return this.branches.create(body, auth.userId);
  }

  @RequirePermission('branch.view', BY_ID)
  @ZResponse(branchSchema)
  @Get(':id')
  get(@UuidParam() id: string): Promise<Branch> {
    return this.branches.getById(id);
  }

  @RequirePermission('branch.manage')
  @Audited('branch.update')
  @ZResponse(branchSchema)
  @Patch(':id')
  update(@UuidParam() id: string, @ZBody(updateBranchSchema) body: UpdateBranch): Promise<Branch> {
    return this.branches.update(id, body);
  }

  /** Stops new orders at the branch; its data stays readable. */
  @RequirePermission('branch.manage')
  @Audited('branch.deactivate')
  @ZResponse(branchSchema)
  @HttpCode(200)
  @Post(':id/deactivate')
  deactivate(@UuidParam() id: string): Promise<Branch> {
    return this.branches.setActive(id, false);
  }

  @RequirePermission('branch.manage')
  @Audited('branch.activate')
  @ZResponse(branchSchema)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@UuidParam() id: string): Promise<Branch> {
    return this.branches.setActive(id, true);
  }

  @RequirePermission('branch.view', BY_ID)
  @ZResponse(branchSettingsSchema)
  @Get(':id/settings')
  getSettings(@UuidParam() id: string): Promise<BranchSettings> {
    return this.branches.getSettings(id);
  }

  @RequirePermission('branch.settings', BY_ID)
  @Audited('branch.settings_update')
  @ZResponse(branchSettingsSchema)
  @Put(':id/settings')
  updateSettings(
    @UuidParam() id: string,
    @ZBody(updateBranchSettingsSchema) body: UpdateBranchSettings,
  ): Promise<BranchSettings> {
    return this.branches.updateSettings(id, body);
  }
}
