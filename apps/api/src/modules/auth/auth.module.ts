import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RbacModule } from '../rbac/rbac.module.js';
import { AccessTokenService } from './access-token.service.js';
import { AccessGuard } from './access.guard.js';
import { SessionStore } from './session-store.js';

/** Authentication: access tokens, sessions and the default-deny guard on every endpoint. */
@Module({
  imports: [RbacModule],
  providers: [AccessTokenService, SessionStore, { provide: APP_GUARD, useClass: AccessGuard }],
  exports: [AccessTokenService, SessionStore],
})
export class AuthModule {}
