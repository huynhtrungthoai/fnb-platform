import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@fnb/contract';

import { RedisRateLimitStore } from '../common/rate-limit/rate-limiter.js';
import { runMigrations } from '../db/migrate.js';
import { systemMeta } from '../db/schema.js';
import { runSeed } from '../db/seed.js';
import { createTestApp } from './test-app.js';
import { resolveTestEnv } from './test-env.js';

import type { TestApp } from './test-app.js';

let test: TestApp;

beforeAll(async () => {
  test = await createTestApp();
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.close();
});

describe('test environment', () => {
  it('derives a separate test database and Redis database from the development settings', () => {
    const env = resolveTestEnv({
      DATABASE_URL: 'postgres://fnb:secret@localhost:5433/fnb',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(env.databaseUrl).toBe('postgres://fnb:secret@localhost:5433/fnb_test');
    expect(env.databaseName).toBe('fnb_test');
    expect(env.redisUrl).toBe('redis://localhost:6379/15');
  });

  it('refuses a database that is not named as a test database', () => {
    expect(() =>
      resolveTestEnv({
        DATABASE_URL: 'postgres://fnb:secret@localhost:5433/fnb',
        TEST_DATABASE_URL: 'postgres://fnb:secret@localhost:5433/fnb',
      }),
    ).toThrow(/must end with _test/);
  });

  it('runs against the test database, never the development one', async () => {
    const result = await test.db.execute<{ name: string }>(sql`select current_database() as name`);
    expect(result.rows[0]?.name).toMatch(/_test$/);
  });
});

describe('database', () => {
  it('has every migration applied, and applying them again changes nothing', async () => {
    await runMigrations(test.db);
    const result = await test.db.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    expect(result.rows.map((row) => row.tablename)).toContain('system_meta');
  });

  it('seeds idempotently and records the run', async () => {
    let runs = 0;
    const steps = [
      {
        name: 'count',
        run: () => {
          runs += 1;
          return Promise.resolve();
        },
      },
    ];
    await runSeed(test.db, steps);
    await runSeed(test.db, steps);

    const rows = await test.db.select().from(systemMeta);
    expect(runs).toBe(2);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toMatchObject({ steps: ['count'] });
  });

  it('starts every test with empty tables', async () => {
    expect(await test.db.select().from(systemMeta)).toHaveLength(0);
  });
});

describe('application', () => {
  it('boots the real AppModule and reaches Postgres and Redis with real commands', async () => {
    const response = await test.http.get('/health').expect(200);
    const body = healthResponseSchema.parse(response.body);
    expect(body.dependencies.database).toBe('up');
    expect(body.dependencies.redis).toBe('up');
  });

  it('counts rate limit hits in Redis and sets an expiry on the counter', async () => {
    const store = new RedisRateLimitStore(test.redis);
    expect(await store.hit('login:10.0.0.9', 30)).toEqual({ count: 1, resetInSeconds: 30 });
    expect((await store.hit('login:10.0.0.9', 30)).count).toBe(2);
    expect(await test.redis.ttl('rate:login:10.0.0.9')).toBeGreaterThan(0);
  });
});
