import { Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';

import {
  assignmentBranchParamSchema,
  createUserSchema,
  resetPinSchema,
  setAssignmentSchema,
  updateUserSchema,
  userAccessSchema,
  userListQuerySchema,
  userWithAssignmentsSchema,
} from '@fnb/contract';

import { Auth, RequirePermission } from '../../common/decorators/access.decorators.js';
import { UuidParam, ZBody, ZParam, ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { UserCredentialsService } from './user-credentials.service.js';
import { UsersService } from './users.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { Paginated } from '../../common/http/pagination.js';
import type {
  CreateUser,
  ResetPin,
  SetAssignment,
  UpdateUser,
  UserAccessView,
  UserListQuery,
  UserWithAssignments,
} from '@fnb/contract';

/**
 * Staff accounts (CORE-10, CORE-11). Every endpoint needs its permission at one branch at least;
 * the service then checks each branch the action touches (06 section 8).
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly credentials: UserCredentialsService,
  ) {}

  @RequirePermission('user.view', { branch: 'any' })
  @ZResponse(userWithAssignmentsSchema, {
    isPage: true,
    summary: 'List the staff the caller may see',
  })
  @Get()
  list(
    @Auth() auth: AuthContext,
    @ZQuery(userListQuerySchema) query: UserListQuery,
  ): Promise<Paginated<UserWithAssignments>> {
    return this.users.list(auth, query);
  }

  @RequirePermission('user.manage', { branch: 'any' })
  @Audited('user.create')
  @ZResponse(userWithAssignmentsSchema, { summary: 'Create an account with a temporary PIN' })
  @Post()
  create(
    @Auth() auth: AuthContext,
    @ZBody(createUserSchema) body: CreateUser,
  ): Promise<UserWithAssignments> {
    return this.users.create(auth, body);
  }

  @RequirePermission('user.view', { branch: 'any' })
  @ZResponse(userWithAssignmentsSchema)
  @Get(':id')
  get(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<UserWithAssignments> {
    return this.users.getById(auth, id);
  }

  @RequirePermission('user.manage', { branch: 'any' })
  @Audited('user.update')
  @ZResponse(userWithAssignmentsSchema)
  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZBody(updateUserSchema) body: UpdateUser,
  ): Promise<UserWithAssignments> {
    return this.users.update(auth, id, body);
  }

  /** Blocks sign-in and ends every session of the account. */
  @RequirePermission('user.manage', { branch: 'any' })
  @Audited('user.disable')
  @ZResponse(userWithAssignmentsSchema)
  @HttpCode(200)
  @Post(':id/disable')
  disable(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<UserWithAssignments> {
    return this.users.setActive(auth, id, false);
  }

  @RequirePermission('user.manage', { branch: 'any' })
  @Audited('user.enable')
  @ZResponse(userWithAssignmentsSchema)
  @HttpCode(200)
  @Post(':id/enable')
  enable(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<UserWithAssignments> {
    return this.users.setActive(auth, id, true);
  }

  /** Effective permissions at each branch (CORE-29). */
  @RequirePermission('user.view', { branch: 'any' })
  @ZResponse(userAccessSchema)
  @Get(':id/access')
  access(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<UserAccessView> {
    return this.users.getAccess(auth, id);
  }

  /** Sets the group at one branch, or at all branches with `branchId: null`. */
  @RequirePermission('role.assign', { branch: 'any' })
  @Audited('user.assign_role')
  @ZResponse(userWithAssignmentsSchema)
  @Put(':id/assignments')
  assign(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZBody(setAssignmentSchema) body: SetAssignment,
  ): Promise<UserWithAssignments> {
    return this.users.assign(auth, id, body);
  }

  /** Removes the group at one branch; `all` removes the all-branches assignment. */
  @RequirePermission('role.assign', { branch: 'any' })
  @Audited('user.unassign_role')
  @ZResponse(userWithAssignmentsSchema)
  @Delete(':id/assignments/:branchId')
  unassign(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZParam('branchId', assignmentBranchParamSchema) branchId: string | null,
  ): Promise<UserWithAssignments> {
    return this.users.unassign(auth, id, branchId);
  }

  /** Sets a temporary PIN, unlocks the account and ends its sessions (CORE-14). */
  @RequirePermission('user.reset_credentials', { branch: 'any' })
  @Audited('user.reset_pin')
  @ZResponse(userWithAssignmentsSchema)
  @HttpCode(200)
  @Post(':id/reset-pin')
  resetPin(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZBody(resetPinSchema) body: ResetPin,
  ): Promise<UserWithAssignments> {
    return this.credentials.resetPin(auth, id, body.pin);
  }

  /** Unlocks an account locked after five wrong PINs; the PIN does not change. */
  @RequirePermission('user.reset_credentials', { branch: 'any' })
  @Audited('user.unlock')
  @ZResponse(userWithAssignmentsSchema)
  @HttpCode(200)
  @Post(':id/unlock')
  unlock(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<UserWithAssignments> {
    return this.credentials.unlock(auth, id);
  }
}
