import { Inject, Injectable } from '@nestjs/common';

import { REDIS } from '../../redis/redis.module.js';

import type { Redis } from 'ioredis';

const sessionKey = (sessionId: string): string => `session:${sessionId}`;
const userSessionsKey = (userId: string): string => `user-sessions:${userId}`;

/**
 * Which sessions are active, in Redis. The guard asks on every request, so ending a session
 * (logout, disabled account, reset PIN) cuts access at once instead of when the token expires.
 */
@Injectable()
export class SessionStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Marks a session active for `ttlSeconds`. Called at login and again at every token refresh. */
  async activate(sessionId: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis
      .multi()
      .set(sessionKey(sessionId), userId, 'EX', ttlSeconds)
      .sadd(userSessionsKey(userId), sessionId)
      .expire(userSessionsKey(userId), ttlSeconds)
      .exec();
  }

  /** True when the session is active and belongs to the user. */
  async isActive(sessionId: string, userId: string): Promise<boolean> {
    return (await this.redis.get(sessionKey(sessionId))) === userId;
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    await this.redis
      .multi()
      .del(sessionKey(sessionId))
      .srem(userSessionsKey(userId), sessionId)
      .exec();
  }

  /** Ends every session of the user. Returns how many were active. */
  async revokeAllOfUser(userId: string): Promise<number> {
    const sessionIds = await this.redis.smembers(userSessionsKey(userId));
    if (sessionIds.length > 0) {
      await this.redis.del(...sessionIds.map(sessionKey));
    }
    await this.redis.del(userSessionsKey(userId));
    return sessionIds.length;
  }
}
