import { systemMeta } from './schema.js';

import type { Database } from './database.js';

/** One step of the seed. Steps are idempotent: running the seed twice changes nothing. */
export interface SeedStep {
  name: string;
  run: (db: Database) => Promise<void>;
}

/**
 * Seed steps in the order they run. Feature tasks append their own step here
 * (default permission groups in M1-10, owner account and sample branch in M1-16).
 */
export const SEED_STEPS: SeedStep[] = [];

/** Runs every seed step, then records when the seed last completed. */
export async function runSeed(
  db: Database,
  steps: readonly SeedStep[] = SEED_STEPS,
  log: (message: string) => void = () => undefined,
): Promise<void> {
  for (const step of steps) {
    log(`seed: ${step.name}`);
    await step.run(db);
  }
  const value = { at: new Date().toISOString(), steps: steps.map((step) => step.name) };
  await db
    .insert(systemMeta)
    .values({ key: 'seed.last_run', value })
    .onConflictDoUpdate({ target: systemMeta.key, set: { value } });
}
