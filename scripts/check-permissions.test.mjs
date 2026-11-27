import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkPermissions,
  checkRepo,
  extractDeclaredPermissions,
  extractRequiredCodes,
  parsePermissionTable,
} from './check-permissions.mjs';

const CONTRACT_SOURCE = `
export const salesPermissions = definePermissions('sales', {
  'order.view': {
    scope: 'branch',
    surfaces: ['admin', 'pos'],
    defaultRoles: ['manager', 'cashier'],
  },
  'order.void_order': {
    scope: 'branch',
    surfaces: ['pos'],
    sensitive: true,
    approvable: true,
    requires: ['order.view'],
    defaultRoles: ['manager'],
  },
  'menu.manage': {
    scope: 'business',
    surfaces: ['admin'],
    defaultRoles: [],
  },
});
`;

const PLAN = `
## 3. Khác

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| \`order.view\` | ignored, outside section 4 | | | | | | | |

## 4. Danh mục

### 4.1 Bán hàng

| Mã quyền | Cho phép | QL | TN | NV | Bếp | Kho | KT | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| \`order.view\` | Xem đơn | ● | ◐ | | | | | |
| \`order.void_order\` | Huỷ đơn | ● | | | | | | N, D |
| \`menu.manage\` | Sửa thực đơn | | | | | | | DN |
| \`order.refund\` | Chưa khai báo trong code | ● | | | | | | N, D |

## 5. Hạn mức
`;

/** @param {string[]} codes */
function translationsFor(codes) {
  /** @type {Record<string, Record<string, { name: string, description: string }>>} */
  const entries = {};
  for (const code of codes) {
    const [group = '', action = ''] = code.split('.');
    entries[group] = { ...entries[group], [action]: { name: code, description: code } };
  }
  const locale = { modules: { sales: 'Bán hàng' }, codes: entries };
  return { vi: locale, en: locale };
}

const declared = extractDeclaredPermissions(CONTRACT_SOURCE);
const allCodes = declared.map((permission) => permission.code);
const { rows: tableRows } = parsePermissionTable(PLAN);

describe('extractDeclaredPermissions', () => {
  it('reads code, module, scope, default groups and flags', () => {
    assert.deepEqual(declared, [
      {
        code: 'order.view',
        module: 'sales',
        scope: 'branch',
        defaultRoles: ['cashier', 'manager'],
        isSensitive: false,
        isApprovable: false,
      },
      {
        code: 'order.void_order',
        module: 'sales',
        scope: 'branch',
        defaultRoles: ['manager'],
        isSensitive: true,
        isApprovable: true,
      },
      {
        code: 'menu.manage',
        module: 'sales',
        scope: 'business',
        defaultRoles: [],
        isSensitive: false,
        isApprovable: false,
      },
    ]);
  });

  it('ignores files that declare no permissions', () => {
    assert.deepEqual(extractDeclaredPermissions("export const x = { 'a.b': {} };"), []);
  });
});

describe('extractRequiredCodes', () => {
  it('finds the codes of @RequirePermission, with or without options', () => {
    const source = `
      @RequirePermission('order.view')
      @RequirePermission(
        'menu.manage', { branch: 'any' })`;
    assert.deepEqual(extractRequiredCodes(source), ['order.view', 'menu.manage']);
  });
});

describe('parsePermissionTable', () => {
  it('reads only section 4, with granted groups and notes', () => {
    assert.deepEqual(tableRows, [
      { code: 'order.view', roles: ['cashier', 'manager'], notes: [] },
      { code: 'order.void_order', roles: ['manager'], notes: ['N', 'D'] },
      { code: 'menu.manage', roles: [], notes: ['DN'] },
      { code: 'order.refund', roles: ['manager'], notes: ['N', 'D'] },
    ]);
  });

  it('reports a code listed twice', () => {
    const doubled = PLAN.replace('## 5.', '| `order.view` | again | | | | | | | |\n\n## 5.');
    assert.deepEqual(parsePermissionTable(doubled).problems, [
      'plans/06: `order.view` appears twice in section 4',
    ]);
  });
});

describe('checkPermissions', () => {
  const valid = {
    declared,
    requiredCodes: new Set(allCodes),
    translations: translationsFor(allCodes),
    tableRows,
  };

  it('accepts a consistent catalog, even with table rows not declared yet', () => {
    assert.deepEqual(checkPermissions(valid), []);
  });

  it('reports a missing translation', () => {
    const translations = translationsFor(['order.view', 'menu.manage']);
    const problems = checkPermissions({ ...valid, translations });
    assert.ok(problems.includes('vi/permissions: missing codes.order.void_order.name'));
    assert.ok(problems.includes('en/permissions: missing codes.order.void_order.description'));
  });

  it('reports a permission no endpoint uses, and an endpoint using an undeclared one', () => {
    const problems = checkPermissions({
      ...valid,
      requiredCodes: new Set(['order.view', 'order.void_order', 'order.unknown']),
    });
    assert.deepEqual(problems, [
      "menu.manage: declared but no endpoint uses @RequirePermission('menu.manage')",
      "@RequirePermission('order.unknown') names a permission that is not declared",
    ]);
  });

  it('reports a table that drifted from the code', () => {
    const drifted = parsePermissionTable(
      PLAN.replace('| ● | ◐ |', '| ● | |').replace('| N, D |', '| N |').replace('| DN |', '| |'),
    ).rows;
    assert.deepEqual(checkPermissions({ ...valid, tableRows: drifted }), [
      'order.view: default groups differ: plans/06 [manager] vs code [cashier, manager]',
      'order.void_order: plans/06 note "D" missing but code has approvable: true',
      'menu.manage: plans/06 note "DN" missing but code has scope: \'business\'',
    ]);
  });

  it('reports a declared permission without a table row', () => {
    const problems = checkPermissions({
      ...valid,
      tableRows: tableRows.filter((row) => row.code !== 'menu.manage'),
    });
    assert.deepEqual(problems, ['menu.manage: no row in plans/06 section 4']);
  });
});

describe('checkRepo', () => {
  it('passes on this repository', () => {
    const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
    assert.deepEqual(checkRepo(repoRoot), []);
  });
});
