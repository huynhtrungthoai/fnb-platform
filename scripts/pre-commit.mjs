#!/usr/bin/env node
/**
 * Runs from `.githooks/pre-commit` on the staged files only (plans/02-repo-setup.md section 3.1):
 *   1. file names: English, kebab-case, ASCII
 *   2. Prettier (check only; run `pnpm format` to fix)
 *   3. ESLint
 * CI runs the full `pnpm verify`; this hook is the fast first line.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkFilenames } from './check-filenames.mjs';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const LINTABLE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
/** Design inputs and generated files that ESLint ignores anyway. */
const NOT_LINTED = /^(ui-mockup|brands)\/|\.gen\.ts$/;

/**
 * Picks the staged files ESLint should check.
 * @param {readonly string[]} files
 * @returns {string[]}
 */
export function selectLintableFiles(files) {
  return files.filter((file) => LINTABLE.test(file) && !NOT_LINTED.test(file));
}

/** Added, copied, modified or renamed files in the index; deleted files are skipped. */
function listStagedFiles() {
  const output = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return output.split('\0').filter((file) => file.length > 0);
}

/** @param {string} title @param {string[]} args */
function runTool(title, args) {
  const result = spawnSync('pnpm', ['exec', ...args], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\npre-commit: ${title} failed. Fix the problems above and commit again.`);
    process.exit(result.status ?? 1);
  }
}

function main() {
  const staged = listStagedFiles();
  if (staged.length === 0) {
    return;
  }

  const nameFailures = checkFilenames(staged);
  if (nameFailures.length > 0) {
    console.error('pre-commit: invalid file name(s)');
    for (const { file, problem } of nameFailures) {
      console.error(`  ${file}: ${problem}`);
    }
    console.error('File and folder names must be English, kebab-case, ASCII only.');
    process.exit(1);
  }

  // A staged file can already be gone from the working tree; the tools read from disk.
  const present = staged.filter((file) => existsSync(resolve(repoRoot, file)));
  if (present.length === 0) {
    return;
  }

  runTool('Prettier', ['prettier', '--check', '--ignore-unknown', '--', ...present]);

  const lintable = selectLintableFiles(present);
  if (lintable.length > 0) {
    runTool('ESLint', ['eslint', '--no-warn-ignored', '--', ...lintable]);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
