#!/usr/bin/env node
/**
 * Entry point of `pnpm db:generate`, `pnpm db:migrate` and `pnpm db:seed`.
 * The database layer (Drizzle connection, migrations, seed) is task M1-01. Until then these
 * commands fail on purpose with a clear message instead of pretending to work.
 * M1-01 replaces this file by delegating to the scripts of `apps/api`.
 */
const task = process.argv[2] ?? 'db';

console.error(
  `pnpm db:${task} is not available yet: the database layer is added in M1-01 ` +
    '(plans/90-roadmap.md). Local Postgres itself is started with `pnpm infra:up`.',
);
process.exit(1);
