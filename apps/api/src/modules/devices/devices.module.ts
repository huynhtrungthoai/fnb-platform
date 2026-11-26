import { Module } from '@nestjs/common';

import { SessionModule } from '../auth/session/session.module.js';
import { BranchesModule } from '../branches/branches.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UsersModule } from '../users/users.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesRepository } from './devices.repository.js';
import { DevicesService } from './devices.service.js';

/** POS and KDS devices and the staff sessions opened on them (CORE-30 → CORE-33). */
@Module({
  imports: [SessionModule, BranchesModule, RbacModule, UsersModule],
  controllers: [DevicesController],
  providers: [DevicesRepository, DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
