import { loadDotEnv } from '../config/env.js';

/** Redis logical database reserved for tests, so a test run never touches development data. */
const TEST_REDIS_DATABASE = 15;

/** Connection settings of a test run. */
export interface TestEnv {
  /** The development database; only used to create and drop the test database. */
  adminDatabaseUrl: string;
  /** The database the tests run against. */
  databaseUrl: string;
  databaseName: string;
  redisUrl: string;
}

/**
 * Works out where integration tests connect (M1-05). Tests use the Postgres and Redis of
 * `pnpm infra:up`, but never the development data: a separate database `<name>_test` and
 * Redis database 15. `TEST_DATABASE_URL` and `TEST_REDIS_URL` override the derived values.
 */
export function resolveTestEnv(source: Record<string, string | undefined> = process.env): TestEnv {
  const adminDatabaseUrl = source.DATABASE_URL;
  if (!adminDatabaseUrl) {
    throw new Error('DATABASE_URL is not set; copy .env.example to .env or run from the repo.');
  }
  const database = new URL(source.TEST_DATABASE_URL ?? adminDatabaseUrl);
  if (!source.TEST_DATABASE_URL) {
    database.pathname = `${database.pathname.replace(/_test$/, '')}_test`;
  }
  const databaseName = decodeURIComponent(database.pathname.slice(1));
  if (!/^[a-z0-9_]+_test$/.test(databaseName)) {
    // The test database is dropped on every run; refuse anything that is not clearly a test database.
    throw new Error(
      `Refusing to run tests against database "${databaseName}": name must end with _test`,
    );
  }

  const redis = new URL(source.TEST_REDIS_URL ?? source.REDIS_URL ?? 'redis://localhost:6379');
  if (!source.TEST_REDIS_URL) {
    redis.pathname = `/${TEST_REDIS_DATABASE}`;
  }
  return {
    adminDatabaseUrl,
    databaseUrl: database.toString(),
    databaseName,
    redisUrl: redis.toString(),
  };
}

/**
 * Points this process at the test database and the test Redis. Called from the Vitest setup
 * file before any test module loads, so `loadEnv()` in the app sees the test values.
 */
export function applyTestEnv(): TestEnv {
  if (process.env.FNB_TEST_ENV_APPLIED === '1') {
    return {
      adminDatabaseUrl: process.env.FNB_TEST_ADMIN_DATABASE_URL ?? '',
      databaseUrl: process.env.DATABASE_URL ?? '',
      databaseName: new URL(process.env.DATABASE_URL ?? 'postgres://x/x').pathname.slice(1),
      redisUrl: process.env.REDIS_URL ?? '',
    };
  }
  loadDotEnv();
  const env = resolveTestEnv();
  process.env.NODE_ENV = 'test';
  process.env.FNB_TEST_ADMIN_DATABASE_URL = env.adminDatabaseUrl;
  process.env.DATABASE_URL = env.databaseUrl;
  process.env.REDIS_URL = env.redisUrl;
  process.env.FNB_TEST_ENV_APPLIED = '1';
  return env;
}
