import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { planSingleTest } from './run-tests.mjs';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');

describe('planSingleTest', () => {
  it('runs a package test with vitest from that package', () => {
    assert.deepEqual(planSingleTest('packages/utils/src/money.test.ts', repoRoot), {
      command: 'pnpm',
      args: ['exec', 'vitest', 'run', 'src/money.test.ts'],
      cwd: resolve(repoRoot, 'packages/utils'),
    });
  });

  it('runs an app test with vitest from that app', () => {
    const plan = planSingleTest('apps/api/src/config/env.test.ts', repoRoot);
    assert.equal('cwd' in plan ? plan.cwd : '', resolve(repoRoot, 'apps/api'));
  });

  it('runs a script test with the node test runner', () => {
    const plan = planSingleTest('scripts/check-i18n.test.mjs', repoRoot);
    assert.deepEqual('args' in plan ? plan.args : [], [
      '--test',
      resolve(repoRoot, 'scripts/check-i18n.test.mjs'),
    ]);
  });

  it('accepts an absolute path', () => {
    const plan = planSingleTest(resolve(repoRoot, 'packages/utils/src/uuid.test.ts'), repoRoot);
    assert.deepEqual('args' in plan ? plan.args : [], [
      'exec',
      'vitest',
      'run',
      'src/uuid.test.ts',
    ]);
  });

  it('explains a missing file, a path outside the repo and a non-test location', () => {
    assert.match(
      JSON.stringify(planSingleTest('packages/utils/src/nope.test.ts', repoRoot)),
      /No such file/,
    );
    assert.match(JSON.stringify(planSingleTest('../outside.test.ts', repoRoot)), /No such file/);
    assert.match(JSON.stringify(planSingleTest('README.md', repoRoot)), /Not a test inside/);
  });
});
