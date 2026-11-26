#!/usr/bin/env node
/**
 * `pnpm test`            runs every package's tests through Turborepo, then the script tests.
 * `pnpm test -- <path>`  runs one test file: the path decides which package (or scripts/) runs it.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');

/**
 * Works out how to run one test file.
 * @param {string} target Path as typed, relative to the repo root or absolute.
 * @param {string} root Repo root.
 * @returns {{ command: string, args: string[], cwd: string } | { error: string }}
 */
export function planSingleTest(target, root) {
  const absolute = resolve(root, target);
  const parts = relative(root, absolute).split(sep);
  const [top, name, ...rest] = parts;

  if (parts[0] === '..' || !existsSync(absolute)) {
    return { error: `No such file in this repo: ${target}` };
  }
  if (top === 'scripts') {
    return { command: 'node', args: ['--test', absolute], cwd: root };
  }
  if ((top === 'apps' || top === 'packages') && name && rest.length > 0) {
    return {
      command: 'pnpm',
      args: ['exec', 'vitest', 'run', rest.join('/')],
      cwd: resolve(root, top, name),
    };
  }
  return { error: `Not a test inside apps/, packages/ or scripts/: ${target}` };
}

/** @param {string} command @param {string[]} args @param {string} cwd */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  return result.status ?? 1;
}

function main() {
  const targets = process.argv.slice(2).filter((argument) => argument !== '--');

  if (targets.length === 0) {
    const turboStatus = run('pnpm', ['exec', 'turbo', 'run', 'test'], repoRoot);
    if (turboStatus !== 0) {
      process.exit(turboStatus);
    }
    process.exit(run('node', ['--test', 'scripts/*.test.mjs'], repoRoot));
  }

  for (const target of targets) {
    const plan = planSingleTest(target, repoRoot);
    if ('error' in plan) {
      console.error(plan.error);
      process.exit(1);
    }
    const status = run(plan.command, plan.args, plan.cwd);
    if (status !== 0) {
      process.exit(status);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
