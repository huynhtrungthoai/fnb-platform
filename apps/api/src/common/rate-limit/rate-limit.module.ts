import { Global, Module } from '@nestjs/common';

import { RateLimitGuard } from './rate-limit.guard.js';
import { RATE_LIMIT_STORE, RateLimiter, RedisRateLimitStore } from './rate-limiter.js';

/** The rate limiter and its guard, backed by Redis. */
@Global()
@Module({
  providers: [
    { provide: RATE_LIMIT_STORE, useClass: RedisRateLimitStore },
    RateLimiter,
    RateLimitGuard,
  ],
  exports: [RateLimiter, RateLimitGuard],
})
export class RateLimitModule {}
