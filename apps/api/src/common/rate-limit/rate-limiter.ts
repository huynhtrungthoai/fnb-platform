import { Inject, Injectable } from '@nestjs/common';

import { REDIS } from '../../redis/redis.module.js';
import { AppError } from '../errors/app-error.js';

import type { Redis } from 'ioredis';

/** Counts hits per key in a fixed window. */
export interface RateLimitStore {
  /** Adds one hit and returns the count in the current window and the seconds until it resets. */
  hit(key: string, windowSeconds: number): Promise<{ count: number; resetInSeconds: number }>;
}

/** Injection token of the store behind the rate limiter. */
export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

// INCR and EXPIRE in one script, so a crash between the two can never leave a counter without an expiry.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;

/** Rate limit counters in Redis, shared by every API instance. */
@Injectable()
export class RedisRateLimitStore implements RateLimitStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async hit(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; resetInSeconds: number }> {
    const reply: unknown = await this.redis.eval(
      HIT_SCRIPT,
      1,
      `rate:${key}`,
      String(windowSeconds),
    );
    const [count, ttl] = Array.isArray(reply) ? (reply as unknown[]) : [];
    return { count: Number(count ?? 0), resetInSeconds: Number(ttl ?? windowSeconds) };
  }
}

/** A limit: at most `max` hits per `windowSeconds`. */
export interface RateLimitRule {
  /** Name of the limited action, part of the counter key. */
  name: string;
  max: number;
  windowSeconds: number;
}

/** Enforces fixed-window limits. */
@Injectable()
export class RateLimiter {
  constructor(@Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore) {}

  /** Counts one hit of `subject` and throws `RATE_LIMITED` once the limit is passed. */
  async consume(rule: RateLimitRule, subject: string): Promise<void> {
    const { count, resetInSeconds } = await this.store.hit(
      `${rule.name}:${subject}`,
      rule.windowSeconds,
    );
    if (count > rule.max) {
      throw new AppError('RATE_LIMITED', `Rate limit "${rule.name}" exceeded`, {
        params: { retryAfterSeconds: resetInSeconds },
      });
    }
  }
}
