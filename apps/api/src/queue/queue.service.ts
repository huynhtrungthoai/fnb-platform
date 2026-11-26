import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue, UnrecoverableError, Worker } from 'bullmq';

import { ENV } from '../config/env.js';

import type { Env } from '../config/env.js';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { Job, JobsOptions } from 'bullmq';
import type { z } from 'zod';

export { UnrecoverableError };

/** Key prefix of every queue in Redis. */
const PREFIX = 'fnb';

/**
 * Retry policy of every job unless the caller says otherwise (D-25): five attempts with
 * exponential back-off from 2 s (2, 4, 8, 16 s). Completed jobs are trimmed; failed jobs are kept
 * 30 days so they can be inspected and retried (`pnpm --filter @fnb/api cli jobs-failed`).
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 1000, age: 7 * 24 * 3600 },
  removeOnFail: { age: 30 * 24 * 3600 },
};

/** What a processor receives. */
export interface QueueJob<T> {
  id: string;
  name: string;
  data: T;
  /** Attempts already made before this one. */
  attemptsMade: number;
}

/** A job that ran out of attempts. */
export interface FailedJob {
  id: string;
  name: string;
  data: unknown;
  attemptsMade: number;
  failedReason: string;
  failedAt: string | null;
}

/** How a queue's processor runs. */
export interface WorkerOptions {
  concurrency?: number;
}

/**
 * Background jobs on BullMQ over Redis (M1-25, D-25): webhooks (M5), stock deduction (M6),
 * notifications (M7). Modules call `register` once for their queue and `enqueue` to add work.
 * Workers run in the API process unless `QUEUE_WORKERS=false` (a separate worker, M7-10).
 * A processor throws to retry, or throws `UnrecoverableError` to fail at once.
 */
@Injectable()
export class QueueService implements OnApplicationShutdown {
  private readonly logger = new Logger('Queue');
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** Adds a job; returns its id. Pass `jobId` to make the enqueue idempotent. */
  async enqueue(
    queueName: string,
    jobName: string,
    data: unknown,
    options: JobsOptions = {},
  ): Promise<string> {
    const job = await this.queue(queueName).add(jobName, data, options);
    return job.id ?? '';
  }

  /** Starts processing a queue in this process. Call once per queue, at module start. */
  register<T>(
    queueName: string,
    schema: z.ZodType<T>,
    processor: (job: QueueJob<T>) => Promise<unknown>,
    options: WorkerOptions = {},
  ): void {
    if (!this.env.QUEUE_WORKERS || this.workers.has(queueName)) {
      return;
    }
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        // Job data comes back from Redis: parse it like any other outside input.
        const parsed = schema.safeParse(job.data);
        if (!parsed.success) {
          throw new UnrecoverableError(`Invalid job data: ${parsed.error.message}`);
        }
        return processor({
          id: job.id ?? '',
          name: job.name,
          data: parsed.data,
          attemptsMade: job.attemptsMade,
        });
      },
      {
        connection: { url: this.env.REDIS_URL },
        prefix: PREFIX,
        concurrency: options.concurrency ?? 1,
      },
    );
    worker.on('failed', (job, error) => {
      const attempts = job?.opts.attempts ?? 1;
      const made = job?.attemptsMade ?? 0;
      const message = `${queueName}/${job?.name ?? '?'} #${job?.id ?? '?'} attempt ${made}/${attempts}: ${error.message}`;
      if (made >= attempts || error instanceof UnrecoverableError) {
        // TODO(M7-07): post failed jobs to the Discord alert channel (D-33).
        this.logger.error(`Job failed for good: ${message}`);
      } else {
        this.logger.warn(`Job will retry: ${message}`);
      }
    });
    worker.on('error', (error) => {
      this.logger.error(`Worker ${queueName} error: ${error.message}`);
    });
    this.workers.set(queueName, worker);
  }

  /** Jobs that ran out of attempts, newest first. */
  async failed(queueName: string, limit = 50): Promise<FailedJob[]> {
    const jobs = await this.queue(queueName).getFailed(0, limit - 1);
    return jobs.map((job) => ({
      id: job.id ?? '',
      name: job.name,
      data: job.data as unknown,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    }));
  }

  /** Puts a failed job back in the queue for another round of attempts. */
  async retryFailed(queueName: string, jobId: string): Promise<boolean> {
    const job = await this.queue(queueName).getJob(jobId);
    if (!job || !(await job.isFailed())) {
      return false;
    }
    await job.retry('failed');
    return true;
  }

  /** State of a job, for tests and diagnostics. */
  async state(queueName: string, jobId: string): Promise<string> {
    const job = await this.queue(queueName).getJob(jobId);
    return job ? await job.getState() : 'missing';
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.workers.clear();
    this.queues.clear();
  }

  private queue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) {
      return existing;
    }
    const queue = new Queue(name, {
      connection: { url: this.env.REDIS_URL },
      prefix: PREFIX,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queue.on('error', (error) => {
      this.logger.error(`Queue ${name} error: ${error.message}`);
    });
    this.queues.set(name, queue);
    return queue;
  }
}
