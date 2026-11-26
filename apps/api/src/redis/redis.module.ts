import { Global, Inject, Module } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ENV } from '../config/env.js';

import type { Env } from '../config/env.js';
import type { OnApplicationShutdown } from '@nestjs/common';

/** Injection token of the shared Redis client (cache, rate limits, sessions). */
export const REDIS = Symbol('REDIS');

/** Opens a Redis client. Commands fail fast when Redis is down instead of queueing forever. */
export function createRedis(url: string): Redis {
  const client = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: true });
  // Without a listener ioredis prints every reconnect error as an unhandled event.
  client.on('error', () => undefined);
  return client;
}

/** Provides one Redis client to every module. BullMQ and Socket.IO open their own connections. */
@Global()
@Module({
  providers: [
    { provide: REDIS, useFactory: (env: Env) => createRedis(env.REDIS_URL), inject: [ENV] },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}
