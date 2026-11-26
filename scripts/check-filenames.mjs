#!/usr/bin/env node
/**
 * Blocks file and folder names that are not English kebab-case ASCII
 * (plans/02-repo-setup.md section 3.2, docs/code-style.md section 2).
 *
 * Usage:
 *   node scripts/check-filenames.mjs            checks every file git knows about
 *   node scripts/check-filenames.mjs a.ts b.ts  checks only the given paths (pre-commit hook)
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Names that keep their conventional spelling. */
const ALLOWED_NAMES = new Set([
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'CLAUDE.local.md',
  'LICENSE',
  'Dockerfile',
]);

/** Design inputs kept as delivered; they are not source code. */
const IGNORED_PREFIXES = ['ui-mockup/', 'brands/'];

/** kebab-case words separated by dots, with an optional leading dot: `.env.example`, `use-cart.test.ts`. */
const KEBAB_SEGMENT = /^\.?[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/;

/**
 * TanStack Router file routes use `__root`, `_layout`, `$param` and a trailing `_`.
 * Those markers are allowed inside `src/routes/` only; the words between them stay kebab-case.
 */
const ROUTE_SEGMENT =
  /^(__root|[_$]?[a-z0-9]+(-[a-z0-9]+)*_?)(\.(_?\$?[a-z0-9]+(-[a-z0-9]+)*_?|\$))*$/;

const ROUTES_DIR = /^apps\/[^/]+\/src\/routes\//;

/**
 * Returns the reason a path is rejected, or `null` when every segment is valid.
 * @param {string} filePath Path relative to the repo root, with forward slashes.
 * @returns {string | null}
 */
export function findFilenameProblem(filePath) {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }
  const isRoute = ROUTES_DIR.test(normalized);
  const segments = normalized.split('/');

  for (const [index, segment] of segments.entries()) {
    if (ALLOWED_NAMES.has(segment)) {
      continue;
    }
    // eslint-disable-next-line no-control-regex -- the check is exactly "anything outside ASCII"
    if (/[^\x00-\x7f]/.test(segment)) {
      return `"${segment}" contains non-ASCII characters (no accents, no Vietnamese)`;
    }
    if (/\s/.test(segment)) {
      return `"${segment}" contains whitespace`;
    }
    if (/[A-Z]/.test(segment)) {
      return `"${segment}" contains upper-case letters; use kebab-case`;
    }
    const isInsideRoutes = isRoute && index >= 4;
    const pattern = isInsideRoutes ? ROUTE_SEGMENT : KEBAB_SEGMENT;
    if (!pattern.test(segment)) {
      return `"${segment}" is not kebab-case`;
    }
  }
  return null;
}

/**
 * Checks a list of paths.
 * @param {readonly string[]} filePaths
 * @returns {{ file: string, problem: string }[]}
 */
export function checkFilenames(filePaths) {
  const failures = [];
  for (const file of filePaths) {
    const problem = findFilenameProblem(file);
    if (problem) {
      failures.push({ file, problem });
    }
  }
  return failures;
}

/** Tracked files plus new files that are not gitignored. */
function listRepoFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return output.split('\0').filter((file) => file.length > 0);
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : listRepoFiles();
  const failures = checkFilenames(files);

  if (failures.length > 0) {
    console.error(`check-filenames: ${failures.length} invalid name(s)`);
    for (const { file, problem } of failures) {
      console.error(`  ${file}: ${problem}`);
    }
    console.error('File and folder names must be English, kebab-case, ASCII only.');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
