import pg from 'pg';

import { createDatabase, createPool } from '../db/database.js';
import { runMigrations } from '../db/migrate.js';
import { applyTestEnv } from './test-env.js';

const INFRA_HINT =
  'Integration tests need the local Postgres and Redis. Start them with `pnpm infra:up`.';

/**
 * Runs once before the test files (M1-05): recreates the test database from scratch and
 * applies every migration, so each run also proves that the migrations work on an empty database.
 */
export default async function setup(): Promise<void> {
  const env = applyTestEnv();

  const admin = new pg.Client({ connectionString: env.adminDatabaseUrl });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(`${INFRA_HINT} (${error instanceof Error ? error.message : String(error)})`, {
      cause: error,
    });
  }
  try {
    // The name was checked by resolveTestEnv: lower-case letters, digits, underscore, ends with _test.
    await admin.query(`DROP DATABASE IF EXISTS "${env.databaseName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${env.databaseName}"`);
  } finally {
    await admin.end();
  }

  const pool = createPool(env.databaseUrl, 1);
  try {
    await runMigrations(createDatabase(pool));
  } finally {
    await pool.end();
  }
}
