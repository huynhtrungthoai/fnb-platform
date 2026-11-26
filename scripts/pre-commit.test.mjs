import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { selectLintableFiles } from './pre-commit.mjs';

describe('selectLintableFiles', () => {
  it('keeps source files and drops everything ESLint does not handle', () => {
    assert.deepEqual(
      selectLintableFiles([
        'apps/admin/src/main.tsx',
        'packages/utils/src/money.ts',
        'scripts/check-i18n.mjs',
        'plans/90-roadmap.md',
        'packages/i18n/locales/vi/common.json',
        'apps/admin/src/styles.css',
        'apps/admin/src/route-tree.gen.ts',
        'ui-mockup/support.js',
      ]),
      ['apps/admin/src/main.tsx', 'packages/utils/src/money.ts', 'scripts/check-i18n.mjs'],
    );
  });

  it('returns an empty list when nothing is lintable', () => {
    assert.deepEqual(selectLintableFiles(['README.md', 'docker-compose.yml']), []);
  });
});
