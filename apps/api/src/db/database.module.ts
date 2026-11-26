import { Global, Inject, Module } from '@nestjs/common';

import { ENV } from '../config/env.js';
import { createDatabase, createPool, DB, PG_POOL } from './database.js';

import type { Env } from '../config/env.js';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'pg';

/** Provides the Drizzle client (`DB`) and the pool (`PG_POOL`) to every module. */
@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: (env: Env) => createPool(env.DATABASE_URL), inject: [ENV] },
    { provide: DB, useFactory: (pool: Pool) => createDatabase(pool), inject: [PG_POOL] },
  ],
  exports: [DB, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
