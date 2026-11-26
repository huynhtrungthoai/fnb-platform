import 'reflect-metadata';

import { Controller, Get, Global, Logger, Module, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorSchema } from '@fnb/contract';
import { isUuidV7 } from '@fnb/utils';

import { ENV } from '../../config/env.js';
import { REDIS } from '../../redis/redis.module.js';
import { CommonModule } from '../common.module.js';
import { RequestContext } from '../context/request-context.js';
import { resolveRequestId } from '../context/request-context.middleware.js';
import { RateLimit, RateLimitGuard } from '../rate-limit/rate-limit.guard.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';
import { RATE_LIMIT_STORE, RateLimiter } from '../rate-limit/rate-limiter.js';
import { AppLogger } from './app-logger.js';

import type { RateLimitStore } from '../rate-limit/rate-limiter.js';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

/** In-memory stand-in for Redis; the window never expires during a test. */
class MemoryRateLimitStore implements RateLimitStore {
  readonly counts = new Map<string, number>();

  hit(key: string, windowSeconds: number): Promise<{ count: number; resetInSeconds: number }> {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return Promise.resolve({ count, resetInSeconds: windowSeconds });
  }
}

@Controller('probe')
class ProbeController {
  private readonly logger = new Logger('Probe');

  @Get('context')
  context() {
    this.logger.log('inside handler');
    return { requestId: RequestContext.get()?.requestId ?? null };
  }

  @Get('crash')
  crash() {
    throw new Error('boom');
  }

  @Post('login')
  @RateLimit('login')
  @UseGuards(RateLimitGuard)
  login() {
    return { ok: true };
  }
}

const testEnv = { LOGIN_RATE_LIMIT_MAX: 3, LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60 };

/** Stands in for ConfigModule and RedisModule: no real environment, no real Redis. */
@Global()
@Module({
  providers: [
    { provide: ENV, useValue: testEnv },
    { provide: REDIS, useValue: {} },
  ],
  exports: [ENV, REDIS],
})
class TestInfraModule {}

@Module({
  imports: [TestInfraModule, CommonModule, RateLimitModule],
  controllers: [ProbeController],
})
class ProbeModule {}

const store = new MemoryRateLimitStore();
const lines: string[] = [];
let app: INestApplication<Server>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] })
    .overrideProvider(RATE_LIMIT_STORE)
    .useValue(store)
    .compile();
  app = moduleRef.createNestApplication<INestApplication<Server>>();
  app.useLogger(new AppLogger({ json: true }, (line) => lines.push(line)));
  await app.init();
});

beforeEach(() => {
  lines.length = 0;
  store.counts.clear();
});

afterAll(async () => {
  await app.close();
});

const parsedLines = (): Record<string, unknown>[] =>
  lines.map((line) => JSON.parse(line) as Record<string, unknown>);

describe('request id', () => {
  it('generates an id, returns it in the header and makes it readable in the handler', async () => {
    const response = await request(app.getHttpServer()).get('/probe/context').expect(200);
    const requestId = response.headers['x-request-id'];
    expect(isUuidV7(requestId)).toBe(true);
    expect(response.body).toEqual({ data: { requestId } });
  });

  it('keeps a well-formed incoming id and replaces anything else', async () => {
    const kept = await request(app.getHttpServer())
      .get('/probe/context')
      .set('x-request-id', 'trace-12345678')
      .expect(200);
    expect(kept.headers['x-request-id']).toBe('trace-12345678');

    expect(isUuidV7(resolveRequestId('bad id\nwith newline'))).toBe(true);
    expect(isUuidV7(resolveRequestId(undefined))).toBe(true);
  });

  it('writes the request id on every log line of the request, including the access log', async () => {
    const response = await request(app.getHttpServer()).get('/probe/context?secret=1').expect(200);
    const requestId = response.headers['x-request-id'];
    const entries = parsedLines();

    const handlerLine = entries.find((entry) => entry.message === 'inside handler');
    expect(handlerLine).toMatchObject({ level: 'log', context: 'Probe', requestId });

    const accessLine = entries.find((entry) => entry.context === 'Http');
    expect(accessLine?.requestId).toBe(requestId);
    expect(accessLine?.message).toMatch(/^GET \/probe\/context 200 \d+ms$/);
  });

  it('puts the request id in the error body and in the error log', async () => {
    const response = await request(app.getHttpServer()).get('/probe/crash').expect(500);
    const { error } = apiErrorSchema.parse(response.body);
    expect(error.requestId).toBe(response.headers['x-request-id']);
    const errorLine = parsedLines().find((entry) => entry.level === 'error');
    expect(errorLine?.requestId).toBe(error.requestId);
  });
});

describe('AppLogger', () => {
  it('writes readable text outside production and skips debug lines by default', () => {
    const output: string[] = [];
    const logger = new AppLogger({ json: false }, (line) => output.push(line));
    logger.debug('hidden', 'Ctx');
    logger.warn('careful', 'Ctx');
    expect(output).toHaveLength(1);
    expect(output[0]).toMatch(/WARN\s+\[Ctx\] careful$/);
  });
});

describe('login rate limit', () => {
  it('allows the configured number of attempts, then answers 429 with Retry-After', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer()).post('/probe/login').expect(201);
    }
    const blocked = await request(app.getHttpServer()).post('/probe/login').expect(429);
    expect(apiErrorSchema.parse(blocked.body).error).toMatchObject({
      code: 'RATE_LIMITED',
      params: { retryAfterSeconds: 60 },
    });
    expect(blocked.headers['retry-after']).toBe('60');
  });

  it('counts each subject separately', async () => {
    const limiter = new RateLimiter(store);
    const rule = { name: 'login', max: 1, windowSeconds: 30 };
    await limiter.consume(rule, '10.0.0.1');
    await limiter.consume(rule, '10.0.0.2');
    await expect(limiter.consume(rule, '10.0.0.1')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
});
