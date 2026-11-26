import { Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';

import {
  cloneRoleSchema,
  createRoleSchema,
  permissionInfoSchema,
  roleSchema,
  updateRoleSchema,
} from '@fnb/contract';

import { Auth, RequirePermission } from '../../common/decorators/access.decorators.js';
import { UuidParam, ZBody, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { RolesService } from './roles.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { CloneRole, CreateRole, PermissionInfo, Role, UpdateRole } from '@fnb/contract';

/**
 * Permission groups (CORE-22, CORE-25, CORE-26). Groups are business-wide: viewing needs
 * `role.view` at any branch, changing needs `role.manage` on an all-branches assignment.
 * Members of a group: `GET /users?roleId=`.
 */
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermission('role.view', { branch: 'any' })
  @ZResponse(permissionInfoSchema.array(), { summary: 'The permission catalog' })
  @Get('permissions')
  catalog(): Promise<PermissionInfo[]> {
    return this.roles.catalog();
  }

  @RequirePermission('role.view', { branch: 'any' })
  @ZResponse(roleSchema.array())
  @Get('roles')
  list(): Promise<Role[]> {
    return this.roles.list();
  }

  @RequirePermission('role.view', { branch: 'any' })
  @ZResponse(roleSchema)
  @Get('roles/:id')
  get(@UuidParam() id: string): Promise<Role> {
    return this.roles.getById(id);
  }

  @RequirePermission('role.manage')
  @Audited('role.create')
  @ZResponse(roleSchema, { summary: 'Create a custom group' })
  @Post('roles')
  create(@Auth() auth: AuthContext, @ZBody(createRoleSchema) body: CreateRole): Promise<Role> {
    return this.roles.create(auth, body);
  }

  @RequirePermission('role.manage')
  @Audited('role.create')
  @ZResponse(roleSchema, { summary: 'Copy a group into a new custom group' })
  @Post('roles/:id/clone')
  clone(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZBody(cloneRoleSchema) body: CloneRole,
  ): Promise<Role> {
    return this.roles.clone(auth, id, body);
  }

  @RequirePermission('role.manage')
  @Audited('role.update')
  @ZResponse(roleSchema)
  @Patch('roles/:id')
  update(
    @Auth() auth: AuthContext,
    @UuidParam() id: string,
    @ZBody(updateRoleSchema) body: UpdateRole,
  ): Promise<Role> {
    return this.roles.update(auth, id, body);
  }

  @RequirePermission('role.manage')
  @Audited('role.restore_default')
  @ZResponse(roleSchema)
  @HttpCode(200)
  @Post('roles/:id/restore-default')
  restore(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<Role> {
    return this.roles.restoreDefault(auth, id);
  }

  @RequirePermission('role.manage')
  @Audited('role.delete')
  @HttpCode(204)
  @Delete('roles/:id')
  delete(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<void> {
    return this.roles.delete(auth, id);
  }
}
