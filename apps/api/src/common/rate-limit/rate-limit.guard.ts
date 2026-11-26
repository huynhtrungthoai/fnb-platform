import { Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ENV } from '../../config/env.js';
import { RateLimiter } from './rate-limiter.js';

import type { Env } from '../../config/env.js';
import type { RateLimitRule } from './rate-limiter.js';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';

const RATE_LIMIT_KEY = 'fnb:rateLimit';

/** Named limits. `login` takes its numbers from the environment. */
export type RateLimitName = 'login';

/**
 * Limits how often one IP address may call the endpoint. Use together with
 * `@UseGuards(RateLimitGuard)`.
 */
export const RateLimit = (name: RateLimitName): MethodDecorator =>
  SetMetadata(RATE_LIMIT_KEY, name);

/** Applies the limit named by `@RateLimit` per client IP and answers 429 with `Retry-After`. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiter,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const name = this.reflector.get<RateLimitName | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!name) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    try {
      await this.limiter.consume(this.ruleOf(name), request.ip ?? 'unknown');
    } catch (error) {
      const retryAfter: unknown =
        error instanceof Error && 'params' in error
          ? (error.params as Record<string, unknown> | undefined)?.retryAfterSeconds
          : undefined;
      if (typeof retryAfter === 'number') {
        http.getResponse<Response>().setHeader('Retry-After', String(retryAfter));
      }
      throw error;
    }
    return true;
  }

  private ruleOf(name: RateLimitName): RateLimitRule {
    return {
      name,
      max: this.env.LOGIN_RATE_LIMIT_MAX,
      windowSeconds: this.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    };
  }
}
