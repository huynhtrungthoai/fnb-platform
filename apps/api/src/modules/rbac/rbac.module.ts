import { Module } from '@nestjs/common';

import { PermissionsEvents } from './permissions-events.js';
import { RbacSyncService } from './rbac-sync.service.js';
import { RbacRepository } from './rbac.repository.js';
import { RbacService } from './rbac.service.js';
import { RolesController } from './roles.controller.js';
import { RolesRepository } from './roles.repository.js';
import { RolesService } from './roles.service.js';

/** Permissions, permission groups, limits (plans/06-permissions.md). */
@Module({
  controllers: [RolesController],
  providers: [
    RbacSyncService,
    RbacRepository,
    RbacService,
    PermissionsEvents,
    RolesRepository,
    RolesService,
  ],
  exports: [RbacService, PermissionsEvents],
})
export class RbacModule {}
