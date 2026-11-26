import { Module } from '@nestjs/common';

import { AccessTokenService } from './access-token.service.js';
import { SessionStore } from './session-store.js';

/**
 * Access tokens and the list of active sessions. Kept apart from login so that modules which
 * must end sessions (users: disable an account, reset a PIN) do not depend on the login flow.
 */
@Module({
  providers: [AccessTokenService, SessionStore],
  exports: [AccessTokenService, SessionStore],
})
export class SessionModule {}
