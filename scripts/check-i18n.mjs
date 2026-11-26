#!/usr/bin/env node
/**
 * Keeps the Vietnamese and English locale files in step
 * (plans/40-i18n-copy.md section 9, plans/02-repo-setup.md section 3.2):
 *   - the same namespace files exist in both languages and are registered in `resources.ts`
 *   - the same keys exist in both (plural suffixes may differ: Vietnamese only needs `_other`)
 *   - no value is empty
 *   - `{{parameters}}` match between the two languages
 *
 *   - every error code of `@fnb/contract` has a key in the `errors` namespace
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PARAMETER = /\{\{\s*([^},\s]+)[^}]*\}\}/g;

/**
 * Flattens nested translations into `a.b.c` keys.
 * @param {unknown} value
 * @param {string} [prefix]
 * @returns {Map<string, unknown>}
 */
export function flattenKeys(value, prefix = '') {
  const result = new Map();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    result.set(prefix, value);
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    for (const [childPath, childValue] of flattenKeys(child, path)) {
      result.set(childPath, childValue);
    }
  }
  return result;
}

/**
 * Names of the `{{parameters}}` used in a string, sorted.
 * @param {string} text
 * @returns {string[]}
 */
export function extractParameters(text) {
  return [...new Set([...text.matchAll(PARAMETER)].map((match) => match[1] ?? ''))].sort();
}

/**
 * Compares one namespace in both languages.
 * @param {string} namespace
 * @param {unknown} vi Parsed Vietnamese file.
 * @param {unknown} en Parsed English file.
 * @returns {string[]} Problems found, empty when the two files agree.
 */
export function compareNamespace(namespace, vi, en) {
  const problems = [];
  const sides = { vi: flattenKeys(vi), en: flattenKeys(en) };

  for (const [locale, entries] of Object.entries(sides)) {
    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        problems.push(`${locale}/${namespace}: "${key}" must be a string`);
      } else if (value.trim().length === 0) {
        problems.push(`${locale}/${namespace}: "${key}" is empty`);
      }
    }
  }

  /** @param {Map<string, unknown>} entries */
  const baseKeys = (entries) =>
    new Set([...entries.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')));
  const viBase = baseKeys(sides.vi);
  const enBase = baseKeys(sides.en);
  for (const key of viBase) {
    if (!enBase.has(key)) {
      problems.push(`en/${namespace}: missing key "${key}" (present in vi)`);
    }
  }
  for (const key of enBase) {
    if (!viBase.has(key)) {
      problems.push(`vi/${namespace}: missing key "${key}" (present in en)`);
    }
  }

  // Parameters are compared per base key, so `_one` and `_other` forms are pooled.
  /** @param {Map<string, unknown>} entries */
  const parametersByBaseKey = (entries) => {
    const result = new Map();
    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        continue;
      }
      const base = key.replace(PLURAL_SUFFIX, '');
      const names = result.get(base) ?? new Set();
      for (const name of extractParameters(value)) {
        names.add(name);
      }
      result.set(base, names);
    }
    return result;
  };
  const viParameters = parametersByBaseKey(sides.vi);
  const enParameters = parametersByBaseKey(sides.en);
  for (const [key, viNames] of viParameters) {
    const enNames = enParameters.get(key);
    if (!enNames) {
      continue;
    }
    const viList = [...viNames].sort().join(', ');
    const enList = [...enNames].sort().join(', ');
    if (viList !== enList) {
      problems.push(
        `${namespace}: "${key}" uses different parameters: vi {${viList}} vs en {${enList}}`,
      );
    }
  }

  return problems;
}

/** @param {string} directory */
function listNamespaces(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .sort();
}

/** @param {string} filePath */
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * Checks a whole `packages/i18n` folder.
 * @param {string} i18nRoot Path of `packages/i18n`.
 * @returns {string[]}
 */
export function checkLocales(i18nRoot) {
  const problems = [];
  const viDir = join(i18nRoot, 'locales', 'vi');
  const enDir = join(i18nRoot, 'locales', 'en');
  const viNamespaces = listNamespaces(viDir);
  const enNamespaces = listNamespaces(enDir);

  if (viNamespaces.length === 0) {
    problems.push(`no locale files found in ${viDir}`);
  }
  for (const namespace of viNamespaces) {
    if (!enNamespaces.includes(namespace)) {
      problems.push(`en: missing file ${namespace}.json (present in vi)`);
    }
  }
  for (const namespace of enNamespaces) {
    if (!viNamespaces.includes(namespace)) {
      problems.push(`vi: missing file ${namespace}.json (present in en)`);
    }
  }

  const resourcesPath = join(i18nRoot, 'src', 'resources.ts');
  const resourcesSource = existsSync(resourcesPath) ? readFileSync(resourcesPath, 'utf8') : '';

  for (const namespace of viNamespaces.filter((name) => enNamespaces.includes(name))) {
    let vi;
    let en;
    try {
      vi = readJson(join(viDir, `${namespace}.json`));
      en = readJson(join(enDir, `${namespace}.json`));
    } catch (error) {
      problems.push(
        `${namespace}: invalid JSON (${error instanceof Error ? error.message : 'unknown'})`,
      );
      continue;
    }
    problems.push(...compareNamespace(namespace, vi, en));

    for (const locale of ['vi', 'en']) {
      if (!resourcesSource.includes(`locales/${locale}/${namespace}.json`)) {
        problems.push(
          `${locale}/${namespace}.json is not imported in packages/i18n/src/resources.ts`,
        );
      }
    }
  }

  return problems;
}

/**
 * Reads the error codes out of the contract source, so the check needs no build.
 * @param {string} source Text of `packages/contract/src/errors.ts`.
 * @returns {string[]}
 */
export function extractErrorCodes(source) {
  const list = /ERROR_CODES\s*=\s*\[([^\]]*)\]/.exec(source)?.[1] ?? '';
  return [...list.matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1] ?? '');
}

/**
 * Every error code needs a translation in both languages.
 * @param {string[]} codes
 * @param {Record<string, unknown>} translations Parsed `errors.json` by locale.
 * @returns {string[]}
 */
export function checkErrorCodes(codes, translations) {
  const problems = [];
  for (const [locale, entries] of Object.entries(translations)) {
    const keys = flattenKeys(entries);
    for (const code of codes) {
      if (!keys.has(code)) {
        problems.push(`${locale}/errors: missing translation of error code "${code}"`);
      }
    }
  }
  return problems;
}

function main() {
  const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
  const i18nRoot = join(repoRoot, 'packages', 'i18n');
  const problems = checkLocales(i18nRoot);

  const errorsSource = join(repoRoot, 'packages', 'contract', 'src', 'errors.ts');
  const codes = existsSync(errorsSource)
    ? extractErrorCodes(readFileSync(errorsSource, 'utf8'))
    : [];
  if (codes.length === 0) {
    problems.push('no error codes found in packages/contract/src/errors.ts');
  }
  /** @type {Record<string, unknown>} */
  const translations = {};
  for (const locale of ['vi', 'en']) {
    const filePath = join(i18nRoot, 'locales', locale, 'errors.json');
    translations[locale] = existsSync(filePath) ? readJson(filePath) : {};
  }
  problems.push(...checkErrorCodes(codes, translations));

  if (problems.length > 0) {
    console.error(`check-i18n: ${problems.length} problem(s)`);
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    console.error('Every key needs both vi and en, with the same {{parameters}}.');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
