import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ApprovalsModule } from '../approvals/approvals.module.js';
import { BranchesModule } from '../branches/branches.module.js';
import { DevicesModule } from '../devices/devices.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UsersModule } from '../users/users.module.js';
import { AccessGuard } from './access.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionModule } from './session/session.module.js';

/** Authentication: sign-in, sessions and the default-deny guard on every endpoint. */
@Module({
  imports: [RbacModule, SessionModule, UsersModule, BranchesModule, ApprovalsModule, DevicesModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AuthModule {}
