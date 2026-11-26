import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { DB } from '../db/database.js';
import { REDIS } from '../redis/redis.module.js';

import type { Database } from '../db/database.js';
import type { INestApplication } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import type { Server } from 'node:http';
import type TestAgent from 'supertest/lib/agent.js';

/** A running API wired to the test database and the test Redis. */
export interface TestApp {
  app: INestApplication<Server>;
  /** Supertest client bound to the app. */
  http: TestAgent;
  db: Database;
  redis: Redis;
  /** Empties every table and the test Redis database. Call in `beforeEach`. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

/** Tables that keep their rows between tests. */
const KEPT_TABLES = new Set<string>();

/** Deletes the rows of every table of the `public` schema. */
export async function truncateAllTables(db: Database): Promise<void> {
  const result = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const names = result.rows
    .map((row) => row.tablename)
    .filter((name) => !KEPT_TABLES.has(name))
    .map((name) => `"${name.replaceAll('"', '""')}"`);
  if (names.length > 0) {
    await db.execute(sql.raw(`truncate table ${names.join(', ')} restart identity cascade`));
  }
}

/**
 * Boots the real `AppModule` for an integration test (M1-05). External services are replaced
 * through `customize` (`builder.overrideProvider(...)`); Postgres and Redis are real.
 */
export async function createTestApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<TestApp> {
  const moduleRef = await customize(Test.createTestingModule({ imports: [AppModule] })).compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  app.useLogger(false);
  await app.init();

  const db = app.get<Database>(DB);
  const redis = app.get<Redis>(REDIS);
  return {
    app,
    http: request(app.getHttpServer()),
    db,
    redis,
    reset: async () => {
      await truncateAllTables(db);
      await redis.flushdb();
    },
    close: async () => {
      await app.close();
    },
  };
}
