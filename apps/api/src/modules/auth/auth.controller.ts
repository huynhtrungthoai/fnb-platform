import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';

import { authTokensSchema, loginSchema, meSchema, refreshSchema } from '@fnb/contract';

import { Auth, Authenticated, Public } from '../../common/decorators/access.decorators.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';
import { ZBody, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { AuthService } from './auth.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { AuthTokens, LoginInput, Me, RefreshInput } from '@fnb/contract';

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
  @ZResponse(meSchema, { summary: 'The caller and their permissions at each branch' })
  @Get('me')
  me(@Auth() auth: AuthContext): Promise<Me> {
    return this.auth.me(auth);
  }
}
