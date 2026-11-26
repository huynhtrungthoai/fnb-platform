import { Inject, Injectable, Logger } from '@nestjs/common';

import { REDIS } from '../../redis/redis.module.js';

import type { Redis } from 'ioredis';

/** Redis channel of `permissions.changed`; the socket gateway relays it to the users' clients. */
export const PERMISSIONS_CHANGED_CHANNEL = 'events:permissions.changed';

/**
 * Announces that some users' permissions changed (06 section 7.2). Published on Redis so every
 * API instance's socket gateway hears it; clients then reload `/auth/me`.
 */
@Injectable()
export class PermissionsEvents {
  private readonly logger = new Logger('PermissionsEvents');

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async publishChanged(userIds: readonly string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }
    try {
      await this.redis.publish(PERMISSIONS_CHANGED_CHANNEL, JSON.stringify({ userIds }));
    } catch (error) {
      // The cache is already dropped, so the API enforces the change; only the push is lost.
      this.logger.warn(`Could not publish permissions.changed: ${String(error)}`);
    }
  }
}
