import { Inject, Injectable, Logger } from '@nestjs/common';

import { DB } from '../../db/database.js';
import { syncPermissionCatalog } from './rbac-sync.js';

import type { Database } from '../../db/database.js';
import type { OnApplicationBootstrap } from '@nestjs/common';

/** Synchronises the permission catalog into the database every time the API starts (CORE-20). */
@Injectable()
export class RbacSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger('RbacSync');

  constructor(@Inject(DB) private readonly db: Database) {}

  async onApplicationBootstrap(): Promise<void> {
    const { added, deprecated } = await syncPermissionCatalog(this.db);
    if (added.length > 0) {
      this.logger.log(`New permissions: ${added.join(', ')}`);
    }
    if (deprecated.length > 0) {
      this.logger.warn(`Permissions no longer declared in code: ${deprecated.join(', ')}`);
    }
  }
}
