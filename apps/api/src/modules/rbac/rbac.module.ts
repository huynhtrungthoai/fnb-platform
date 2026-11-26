import { Module } from '@nestjs/common';

import { RbacSyncService } from './rbac-sync.service.js';
import { RbacRepository } from './rbac.repository.js';
import { RbacService } from './rbac.service.js';

/** Permissions, permission groups, limits (plans/06-permissions.md). */
@Module({
  providers: [RbacSyncService, RbacRepository, RbacService],
  exports: [RbacService],
})
export class RbacModule {}
