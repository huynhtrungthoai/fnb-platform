import { Module } from '@nestjs/common';

import { RbacModule } from '../rbac/rbac.module.js';
import { UsersModule } from '../users/users.module.js';
import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsService, IS_APPROVABLE, isApprovablePermission } from './approvals.service.js';

/** On-the-spot approval by PIN (CORE-24). The access guard consumes approval tokens. */
@Module({
  imports: [RbacModule, UsersModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, { provide: IS_APPROVABLE, useValue: isApprovablePermission }],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
