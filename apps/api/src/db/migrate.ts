import { resolve } from 'node:path';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { Database } from './database.js';

/** Folder of the generated SQL migrations: `apps/api/drizzle`, two levels above `src/db` and `dist/db`. */
export const MIGRATIONS_FOLDER = resolve(import.meta.dirname, '../../drizzle');

/** Applies every migration that has not run yet. Safe to call repeatedly. */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
