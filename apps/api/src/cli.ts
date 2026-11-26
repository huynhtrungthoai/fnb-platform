import 'reflect-metadata';

import { loadEnv } from './config/env.js';
import { createDatabase, createPool } from './db/database.js';
import { runMigrations } from './db/migrate.js';
import { runSeed, seedSteps } from './db/seed.js';
import { generatePassword, resetOwnerPassword } from './modules/users/reset-owner-password.js';
import { QueueService } from './queue/queue.service.js';

import type { Env } from './config/env.js';

/** A command of `pnpm --filter @fnb/api cli <name>`. */
type Command = (env: Env, args: readonly string[]) => Promise<void>;

async function withDatabase<T>(
  env: Env,
  work: (db: ReturnType<typeof createDatabase>) => Promise<T>,
): Promise<T> {
  // One connection is enough for a command, and migrations must not run in parallel.
  const pool = createPool(env.DATABASE_URL, 1);
  try {
    return await work(createDatabase(pool));
  } finally {
    await pool.end();
  }
}

const print = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

/** Commands by name. Feature tasks add theirs here (for example `reset-owner-password`). */
const COMMANDS: Record<string, Command> = {
  migrate: (env) =>
    withDatabase(env, async (db) => {
      await runMigrations(db);
      print('Migrations applied.');
    }),
  seed: (env) =>
    withDatabase(env, async (db) => {
      await runSeed(db, seedSteps(env, print), print);
      print('Seed completed.');
    }),
  /** New super admin password: from NEW_OWNER_PASSWORD, or a generated one printed once. */
  'reset-owner-password': (env) =>
    withDatabase(env, async (db) => {
      const given = process.env.NEW_OWNER_PASSWORD ?? '';
      const password = given.length > 0 ? given : generatePassword();
      const { username } = await resetOwnerPassword(db, env, password);
      print(`Password of super admin "${username}" reset; the account is unlocked.`);
      if (given.length === 0) {
        print(`New password (shown once): ${password}`);
      }
    }),
  /** `jobs-failed <queue>`: jobs that ran out of attempts. */
  'jobs-failed': async (env, [queueName = '']) => {
    const queues = new QueueService({ ...env, QUEUE_WORKERS: false });
    try {
      for (const job of await queues.failed(queueName)) {
        print(
          `${job.id}\t${job.name}\t${job.failedAt ?? '-'}\tattempts=${job.attemptsMade}\t${job.failedReason}`,
        );
      }
    } finally {
      await queues.onApplicationShutdown();
    }
  },
  /** `jobs-retry <queue> <jobId>`: puts a failed job back in its queue. */
  'jobs-retry': async (env, [queueName = '', jobId = '']) => {
    const queues = new QueueService({ ...env, QUEUE_WORKERS: false });
    try {
      print(
        (await queues.retryFailed(queueName, jobId))
          ? 'Job queued again.'
          : 'No failed job with that id.',
      );
    } finally {
      await queues.onApplicationShutdown();
    }
  },
};

async function main(): Promise<void> {
  const [name = '', ...args] = process.argv.slice(2);
  const command = COMMANDS[name];
  if (!command) {
    console.error(`Unknown command "${name}". Available: ${Object.keys(COMMANDS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  await command(loadEnv(), args);
}

await main();
