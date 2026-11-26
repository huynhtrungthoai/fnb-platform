import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planDbTask } from './db-task.mjs';

test('migrate and seed build the API, then run its compiled CLI', () => {
  for (const task of ['migrate', 'seed']) {
    const plan = planDbTask(task, []);
    assert.ok(Array.isArray(plan));
    assert.equal(plan.length, 2);
    assert.ok(plan[0].args.includes('--filter=@fnb/api'));
    assert.deepEqual(plan[1].args, ['dist/cli.js', task]);
  }
});

test('generate passes a kebab-case name to drizzle-kit', () => {
  const plan = planDbTask('generate', ['--', 'add-orders']);
  assert.ok(Array.isArray(plan));
  assert.deepEqual(plan[0].args, ['exec', 'drizzle-kit', 'generate', '--name', 'add-orders']);
});

test('generate rejects a name that is not kebab-case', () => {
  assert.ok('error' in planDbTask('generate', ['Thêm_bảng']));
});

test('an unknown task is an error', () => {
  assert.ok('error' in planDbTask('drop', []));
});
