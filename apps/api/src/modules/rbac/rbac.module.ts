import { Module } from '@nestjs/common';

import { RbacSyncService } from './rbac-sync.service.js';

/** Permissions, permission groups, limits (plans/06-permissions.md). */
@Module({
  providers: [RbacSyncService],
})
export class RbacModule {}
