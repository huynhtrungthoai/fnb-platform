import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RbacModule } from '../rbac/rbac.module.js';
import { AccessGuard } from './access.guard.js';
import { SessionModule } from './session/session.module.js';

/** Authentication: the default-deny guard on every endpoint, on top of sessions and permissions. */
@Module({
  imports: [RbacModule, SessionModule],
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
})
export class AuthModule {}
