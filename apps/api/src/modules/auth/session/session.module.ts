import { Module } from '@nestjs/common';

import { AccessTokenService } from './access-token.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { SessionStore } from './session-store.js';
import { SessionService } from './session.service.js';

/**
 * Access tokens, refresh tokens and the list of active sessions. Kept apart from login so that
 * modules which must end sessions (users: disable an account, reset a PIN) do not depend on the
 * login flow.
 */
@Module({
  providers: [AccessTokenService, SessionStore, RefreshTokenRepository, SessionService],
  exports: [AccessTokenService, SessionStore, SessionService],
})
export class SessionModule {}
