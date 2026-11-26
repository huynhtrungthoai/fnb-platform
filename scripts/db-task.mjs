#!/usr/bin/env node
/**
 * Entry point of `pnpm db:generate`, `pnpm db:migrate` and `pnpm db:seed`.
 *   generate  drizzle-kit compares the schema files with the last snapshot and writes a new
 *             SQL migration into apps/api/drizzle (pass a name: `pnpm db:generate -- add-orders`)
 *   migrate   applies the migrations that have not run yet
 *   seed      runs the idempotent seed
 * `migrate` and `seed` run the compiled CLI of apps/api, so the API is built first.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const apiDir = resolve(repoRoot, 'apps/api');

/**
 * Lists the commands one task runs, in order.
 * @param {string} task
 * @param {string[]} extra Arguments after the task name.
 * @returns {{ command: string, args: string[], cwd: string }[] | { error: string }}
 */
export function planDbTask(task, extra) {
  const build = {
    command: 'pnpm',
    args: ['exec', 'turbo', 'run', 'build', '--filter=@fnb/api', '--output-logs=errors-only'],
    cwd: repoRoot,
  };
  if (task === 'generate') {
    const name = extra.find((argument) => argument !== '--');
    if (name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      return { error: `Migration name must be kebab-case ASCII: ${name}` };
    }
    return [
      {
        command: 'pnpm',
        // drizzle-kit joins the name with the sequence number using an underscore.
        args: ['exec', 'drizzle-kit', 'generate', ...(name ? ['--name', name] : [])],
        cwd: apiDir,
      },
    ];
  }
  if (task === 'migrate' || task === 'seed') {
    return [build, { command: 'node', args: ['dist/cli.js', task], cwd: apiDir }];
  }
  return { error: `Unknown database task "${task}". Use generate, migrate or seed.` };
}

function main() {
  const [task = '', ...extra] = process.argv.slice(2);
  const plan = planDbTask(task, extra);
  if ('error' in plan) {
    console.error(plan.error);
    process.exit(1);
  }
  for (const step of plan) {
    const result = spawnSync(step.command, step.args, { cwd: step.cwd, stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
