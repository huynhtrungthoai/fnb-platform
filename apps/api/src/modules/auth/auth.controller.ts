import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';

import {
  authTokensSchema,
  changePasswordSchema,
  changePinSchema,
  loginSchema,
  meSchema,
  refreshSchema,
} from '@fnb/contract';

import {
  AllowTemporaryPin,
  Auth,
  Authenticated,
  Public,
} from '../../common/decorators/access.decorators.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';
import { ZBody, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { AuthService } from './auth.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type {
  AuthTokens,
  ChangePassword,
  ChangePin,
  LoginInput,
  Me,
  RefreshInput,
} from '@fnb/contract';

/** Sign-in, token refresh, logout and the caller's own permissions (CORE-12, CORE-15). */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @ZResponse(authTokensSchema, { summary: 'Sign in with username and PIN (or password)' })
  @HttpCode(200)
  @Post('login')
  login(@ZBody(loginSchema) body: LoginInput): Promise<AuthTokens> {
    return this.auth.login(body);
  }

  /** Rotates the refresh token. The old token is spent; using it again ends the session. */
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @ZResponse(authTokensSchema)
  @HttpCode(200)
  @Post('refresh')
  refresh(@ZBody(refreshSchema) body: RefreshInput): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Authenticated()
  @AllowTemporaryPin()
  @Audited('auth.logout')
  @HttpCode(204)
  @Post('logout')
  logout(@Auth() auth: AuthContext): Promise<void> {
    return this.auth.logout(auth);
  }

  @Authenticated()
  @Audited('auth.logout')
  @HttpCode(204)
  @Post('logout-all')
  logoutEverywhere(@Auth() auth: AuthContext): Promise<void> {
    return this.auth.logoutEverywhere(auth);
  }

  @Authenticated()
  @AllowTemporaryPin()
  @ZResponse(meSchema, { summary: 'The caller and their permissions at each branch' })
  @Get('me')
  me(@Auth() auth: AuthContext): Promise<Me> {
    return this.auth.me(auth);
  }

  /** Replaces the caller's PIN, temporary or not; the current PIN must be right (CORE-14). */
  @Authenticated()
  @AllowTemporaryPin()
  @Audited('auth.change_pin')
  @ZResponse(authTokensSchema, { summary: 'Change your own PIN; returns new tokens' })
  @HttpCode(200)
  @Post('change-pin')
  changePin(
    @Auth() auth: AuthContext,
    @ZBody(changePinSchema) body: ChangePin,
  ): Promise<AuthTokens> {
    return this.auth.changePin(auth, body);
  }

  @Authenticated()
  @Audited('auth.change_password')
  @ZResponse(authTokensSchema, { summary: 'Super admin: change your own password' })
  @HttpCode(200)
  @Post('change-password')
  changePassword(
    @Auth() auth: AuthContext,
    @ZBody(changePasswordSchema) body: ChangePassword,
  ): Promise<AuthTokens> {
    return this.auth.changePassword(auth, body);
  }
}
