#!/usr/bin/env node
/**
 * Keeps the permission catalog honest (plans/06-permissions.md section 11,
 * plans/02-repo-setup.md section 3.2). For every permission declared in `@fnb/contract`:
 *   - it has a name and a description in both `vi` and `en` (`permissions` namespace)
 *   - at least one API endpoint requires it with `@RequirePermission`
 *   - the table of plans/06 section 4 has a row for it with the same default groups,
 *     the same scope (DN), the same sensitivity (N) and the same approvability (D)
 *
 * Reads the TypeScript sources as text, like `check-i18n.mjs`, so it needs no build.
 * Rows of the table for permissions not declared yet are allowed: features declare them later.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Column headers of the table in plans/06 section 4, by default group code. */
export const ROLE_COLUMNS = {
  QL: 'manager',
  TN: 'cashier',
  NV: 'staff',
  Bếp: 'kitchen',
  Kho: 'stock_keeper',
  KT: 'accountant',
};

/** Marks of a table cell that grant the permission: plain or with a limit. */
const GRANTED_MARKS = new Set(['●', '◐']);

/**
 * @typedef {object} DeclaredPermission
 * @property {string} code
 * @property {string} module
 * @property {'branch' | 'business'} scope
 * @property {string[]} defaultRoles
 * @property {boolean} isSensitive
 * @property {boolean} isApprovable
 */

/**
 * @typedef {object} TableRow
 * @property {string} code
 * @property {string[]} roles
 * @property {string[]} notes
 */

/**
 * Reads the permissions of one contract file written with `definePermissions('module', { ... })`.
 * Each definition is a flat object literal (lists use `[]`), so one level of braces is enough.
 * @param {string} source
 * @returns {DeclaredPermission[]}
 */
export function extractDeclaredPermissions(source) {
  const module = /definePermissions\(\s*'([^']+)'/.exec(source)?.[1];
  if (!module) {
    return [];
  }
  const result = [];
  for (const match of source.matchAll(/'([a-z][a-z0-9_]*\.[a-z][a-z0-9_]*)'\s*:\s*\{([^{}]*)\}/g)) {
    const [, code = '', body = ''] = match;
    const roles = /defaultRoles\s*:\s*\[([^\]]*)\]/.exec(body)?.[1] ?? '';
    result.push({
      code,
      module,
      scope: /scope\s*:\s*'business'/.test(body) ? 'business' : 'branch',
      defaultRoles: [...roles.matchAll(/'([a-z_]+)'/g)].map((role) => role[1] ?? '').sort(),
      isSensitive: /sensitive\s*:\s*true/.test(body),
      isApprovable: /approvable\s*:\s*true/.test(body),
    });
  }
  return result;
}

/**
 * Codes passed to `@RequirePermission(...)` in a source file.
 * @param {string} source
 * @returns {string[]}
 */
export function extractRequiredCodes(source) {
  return [...source.matchAll(/RequirePermission\(\s*'([^']+)'/g)].map((match) => match[1] ?? '');
}

/** @param {string} line */
function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Reads the permission tables of plans/06 section 4: every row whose first cell is a code.
 * @param {string} markdown Whole text of plans/06-permissions.md.
 * @returns {{ rows: TableRow[], problems: string[] }}
 */
export function parsePermissionTable(markdown) {
  const start = markdown.search(/^## 4\./m);
  if (start < 0) {
    return { rows: [], problems: ['plans/06: section "## 4." not found'] };
  }
  const rest = markdown.slice(start + 1);
  const end = rest.search(/^## /m);
  const section = end < 0 ? rest : rest.slice(0, end);

  const rows = [];
  const problems = [];
  /** @type {Map<number, string>} */
  let columns = new Map();
  let notesColumn = -1;

  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) {
      continue;
    }
    const cells = splitRow(line);
    if (cells[0] === 'Mã quyền') {
      columns = new Map();
      cells.forEach((cell, index) => {
        const role = ROLE_COLUMNS[/** @type {keyof typeof ROLE_COLUMNS} */ (cell)];
        if (role) {
          columns.set(index, role);
        }
      });
      notesColumn = cells.indexOf('Ghi chú');
      continue;
    }
    const code = /^`([^`]+)`$/.exec(cells[0] ?? '')?.[1];
    if (!code) {
      continue;
    }
    const roles = [...columns]
      .filter(([index]) => GRANTED_MARKS.has(cells[index] ?? ''))
      .map(([, role]) => role)
      .sort();
    const notes = (notesColumn >= 0 ? (cells[notesColumn] ?? '') : '')
      .split(',')
      .map((note) => note.trim())
      .filter((note) => note.length > 0);
    if (rows.some((row) => row.code === code)) {
      problems.push(`plans/06: \`${code}\` appears twice in section 4`);
    }
    rows.push({ code, roles, notes });
  }
  return { rows, problems };
}

/**
 * Compares the declared permissions with their translations, their endpoints and the plan table.
 * @param {object} input
 * @param {DeclaredPermission[]} input.declared
 * @param {Set<string>} input.requiredCodes Codes used by `@RequirePermission` in the API.
 * @param {Record<string, unknown>} input.translations Parsed `permissions.json` by locale.
 * @param {TableRow[]} input.tableRows
 * @returns {string[]}
 */
export function checkPermissions({ declared, requiredCodes, translations, tableRows }) {
  const problems = [];
  const seen = new Set();

  for (const permission of declared) {
    const { code } = permission;
    if (seen.has(code)) {
      problems.push(`${code}: declared twice`);
    }
    seen.add(code);

    for (const [locale, entries] of Object.entries(translations)) {
      for (const field of ['name', 'description']) {
        const value = readPath(entries, ['codes', ...code.split('.'), field]);
        if (typeof value !== 'string' || value.trim().length === 0) {
          problems.push(`${locale}/permissions: missing codes.${code}.${field}`);
        }
      }
      const moduleName = readPath(entries, ['modules', permission.module]);
      if (typeof moduleName !== 'string' || moduleName.trim().length === 0) {
        problems.push(`${locale}/permissions: missing modules.${permission.module}`);
      }
    }

    if (!requiredCodes.has(code)) {
      problems.push(`${code}: declared but no endpoint uses @RequirePermission('${code}')`);
    }

    const row = tableRows.find((candidate) => candidate.code === code);
    if (!row) {
      problems.push(`${code}: no row in plans/06 section 4`);
      continue;
    }
    const tableRoles = row.roles.join(', ');
    const codeRoles = permission.defaultRoles.join(', ');
    if (tableRoles !== codeRoles) {
      problems.push(
        `${code}: default groups differ: plans/06 [${tableRoles}] vs code [${codeRoles}]`,
      );
    }
    const flags = [
      ['DN', permission.scope === 'business', "scope: 'business'"],
      ['N', permission.isSensitive, 'sensitive: true'],
      ['D', permission.isApprovable, 'approvable: true'],
    ];
    for (const [note, inCode, attribute] of flags) {
      if (row.notes.includes(String(note)) !== inCode) {
        problems.push(
          `${code}: plans/06 note "${note}" ${inCode ? 'missing' : 'present'} but code ${inCode ? 'has' : 'lacks'} ${attribute}`,
        );
      }
    }
  }

  for (const code of requiredCodes) {
    if (!seen.has(code)) {
      problems.push(`@RequirePermission('${code}') names a permission that is not declared`);
    }
  }
  return problems;
}

/**
 * @param {unknown} value
 * @param {string[]} path
 * @returns {unknown}
 */
function readPath(value, path) {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) {
      return undefined;
    }
    current = /** @type {Record<string, unknown>} */ (current)[key];
  }
  return current;
}

/**
 * Every `.ts` file below a folder, tests excluded.
 * @param {string} directory
 * @returns {string[]}
 */
function listSources(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'),
    )
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Runs every check on a repo.
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function checkRepo(repoRoot) {
  const permissionsDir = join(repoRoot, 'packages', 'contract', 'src', 'permissions');
  const declared = listSources(permissionsDir).flatMap((file) =>
    extractDeclaredPermissions(readFileSync(file, 'utf8')),
  );
  const problems = [];
  if (declared.length === 0) {
    problems.push(`no permissions found in ${permissionsDir}`);
  }

  const requiredCodes = new Set(
    listSources(join(repoRoot, 'apps', 'api', 'src')).flatMap((file) =>
      extractRequiredCodes(readFileSync(file, 'utf8')),
    ),
  );

  /** @type {Record<string, unknown>} */
  const translations = {};
  for (const locale of ['vi', 'en']) {
    const filePath = join(repoRoot, 'packages', 'i18n', 'locales', locale, 'permissions.json');
    translations[locale] = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : {};
  }

  const planPath = join(repoRoot, 'plans', '06-permissions.md');
  const table = parsePermissionTable(existsSync(planPath) ? readFileSync(planPath, 'utf8') : '');
  problems.push(...table.problems);
  problems.push(
    ...checkPermissions({ declared, requiredCodes, translations, tableRows: table.rows }),
  );
  return problems;
}

function main() {
  const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
  const problems = checkRepo(repoRoot);
  if (problems.length > 0) {
    console.error(`check-permissions: ${problems.length} problem(s)`);
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    console.error('See plans/06-permissions.md section 11 for the steps of a new permission.');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
