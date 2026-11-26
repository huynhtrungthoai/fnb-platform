import { Module } from '@nestjs/common';

import { SessionModule } from '../auth/session/session.module.js';
import { BranchesModule } from '../branches/branches.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { CredentialHasher } from './credential-hasher.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

/** Staff accounts and their groups per branch (CORE-10, CORE-11). */
@Module({
  imports: [RbacModule, SessionModule, BranchesModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, CredentialHasher],
  exports: [UsersService, CredentialHasher],
})
export class UsersModule {}
