import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkFilenames, findFilenameProblem } from './check-filenames.mjs';

describe('findFilenameProblem', () => {
  it('accepts kebab-case names, dotted suffixes and dotfiles', () => {
    for (const file of [
      'apps/admin/src/features/menu/order-summary.tsx',
      'packages/utils/src/money.test.ts',
      'apps/api/src/modules/health/health.controller.ts',
      '.env.example',
      '.github/workflows/ci.yml',
      '.githooks/pre-commit',
      'plans/90-roadmap.md',
      'pnpm-lock.yaml',
      'packages/i18n/locales/vi/common.json',
    ]) {
      assert.equal(findFilenameProblem(file), null, file);
    }
  });

  it('accepts the conventional upper-case names', () => {
    for (const file of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'LICENSE', 'apps/api/Dockerfile']) {
      assert.equal(findFilenameProblem(file), null, file);
    }
  });

  it('rejects accents and other non-ASCII characters', () => {
    assert.match(findFilenameProblem('docs/hướng-dẫn.md') ?? '', /non-ASCII/);
    assert.match(findFilenameProblem('apps/admin/src/món/list.tsx') ?? '', /non-ASCII/);
  });

  it('rejects whitespace, upper case, camelCase and snake_case', () => {
    assert.match(findFilenameProblem('docs/my file.md') ?? '', /whitespace/);
    assert.match(findFilenameProblem('apps/admin/src/OrderSummary.tsx') ?? '', /upper-case/);
    assert.match(findFilenameProblem('apps/admin/src/useCart.ts') ?? '', /upper-case/);
    assert.match(findFilenameProblem('packages/utils/src/money_utils.ts') ?? '', /kebab-case/);
  });

  it('allows router markers only inside src/routes', () => {
    for (const file of [
      'apps/admin/src/routes/__root.tsx',
      'apps/admin/src/routes/index.tsx',
      'apps/admin/src/routes/dev.components.tsx',
      'apps/admin/src/routes/_auth.tsx',
      'apps/admin/src/routes/orders.$order-id.tsx',
      'apps/pos/src/routes/_shell/sale.tsx',
    ]) {
      assert.equal(findFilenameProblem(file), null, file);
    }
    assert.match(findFilenameProblem('apps/admin/src/features/__root.tsx') ?? '', /kebab-case/);
    assert.match(findFilenameProblem('apps/admin/src/routes/OrderList.tsx') ?? '', /upper-case/);
  });

  it('skips design inputs', () => {
    assert.equal(findFilenameProblem('ui-mockup/Main.dc.html'), null);
    assert.equal(findFilenameProblem('brands/Logo Final.png'), null);
  });
});

describe('checkFilenames', () => {
  it('returns one failure per invalid path', () => {
    const failures = checkFilenames([
      'README.md',
      'docs/Tài liệu.md',
      'src/ok-file.ts',
      'src/Bad.ts',
    ]);
    assert.deepEqual(
      failures.map((failure) => failure.file),
      ['docs/Tài liệu.md', 'src/Bad.ts'],
    );
  });
});
