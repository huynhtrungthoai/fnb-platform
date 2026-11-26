import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createTestApp } from '../test/test-app.js';
import { QueueService, UnrecoverableError } from './queue.service.js';

import type { TestApp } from '../test/test-app.js';

let test: TestApp;
let queues: QueueService;

beforeAll(async () => {
  test = await createTestApp();
  queues = test.app.get(QueueService);
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.close();
});

/** Polls until the job reaches one of the states, or fails the test after a few seconds. */
async function waitForState(queue: string, jobId: string, states: string[]): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await queues.state(queue, jobId);
    if (states.includes(state)) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Job ${jobId} never reached ${states.join('/')}`);
}

const payload = z.object({ value: z.number() });
const fast = { backoff: { type: 'fixed', delay: 10 } } as const;

describe('QueueService', () => {
  it('runs a job, and retries a failing one until it succeeds', async () => {
    const seen: { value: number; attemptsMade: number }[] = [];
    queues.register('test-retry', payload, (job) => {
      seen.push({ value: job.data.value, attemptsMade: job.attemptsMade });
      if (job.attemptsMade < 2) {
        return Promise.reject(new Error('temporary failure'));
      }
      return Promise.resolve('done');
    });
    const id = await queues.enqueue('test-retry', 'flaky', { value: 7 }, fast);
    expect(await waitForState('test-retry', id, ['completed', 'failed'])).toBe('completed');
    expect(seen.map((item) => item.attemptsMade)).toEqual([0, 1, 2]);
  });

  it('keeps a job that runs out of attempts in the failed list, and retries it on demand', async () => {
    let shouldFail = true;
    queues.register('test-failed', payload, () =>
      shouldFail ? Promise.reject(new Error('still broken')) : Promise.resolve('ok'),
    );
    const id = await queues.enqueue(
      'test-failed',
      'broken',
      { value: 1 },
      { ...fast, attempts: 2 },
    );
    expect(await waitForState('test-failed', id, ['failed'])).toBe('failed');
    const failed = await queues.failed('test-failed');
    expect(failed).toEqual([
      expect.objectContaining({
        id,
        name: 'broken',
        attemptsMade: 2,
        failedReason: 'still broken',
      }),
    ]);

    shouldFail = false;
    expect(await queues.retryFailed('test-failed', id)).toBe(true);
    expect(await waitForState('test-failed', id, ['completed'])).toBe('completed');
  });

  it('fails at once on invalid data or an UnrecoverableError', async () => {
    let calls = 0;
    queues.register('test-unrecoverable', payload, () => {
      calls += 1;
      return Promise.reject(new UnrecoverableError('bad input'));
    });
    const bad = await queues.enqueue('test-unrecoverable', 'bad', { value: 'x' }, fast);
    const fatal = await queues.enqueue('test-unrecoverable', 'fatal', { value: 2 }, fast);
    expect(await waitForState('test-unrecoverable', bad, ['failed'])).toBe('failed');
    expect(await waitForState('test-unrecoverable', fatal, ['failed'])).toBe('failed');
    expect(calls).toBe(1);
  });
});
