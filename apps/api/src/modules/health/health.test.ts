import 'reflect-metadata';

import { createServer } from 'node:net';

import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@fnb/contract';

import { ENV } from '../../config/env.js';
import { DependencyProbe, isTcpReachable, withTimeout } from './dependency-probe.js';
import { HealthModule } from './health.module.js';

import type { Env } from '../../config/env.js';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const env: Env = {
  NODE_ENV: 'test',
  API_PORT: 4000,
  CORS_ORIGINS: [],
  JWT_SECRET: 'unit-test-secret-0123456789-abcdefghij',
  ACCESS_TOKEN_TTL_SECONDS: 900,
  REFRESH_TOKEN_TTL_SECONDS: 604_800,
  TRUST_PROXY: 0,
  LOGIN_RATE_LIMIT_MAX: 10,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
  DATABASE_URL: 'postgres://fnb:secret@db.test:5432/fnb',
  REDIS_URL: 'redis://redis.test:6379',
  SEED_OWNER_USERNAME: 'owner',
  SEED_OWNER_FULL_NAME: 'Owner',
  SEED_BRANCH_CODE: 'Q1',
  SEED_BRANCH_NAME: 'Sample branch',
  S3_ENDPOINT: 'http://storage.test:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'fnb-test',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  APP_VERSION: '1.2.3',
};

/** Stands in for ConfigModule so the test never reads the real environment. */
@Global()
@Module({ providers: [{ provide: ENV, useValue: env }], exports: [ENV] })
class TestConfigModule {}

let app: INestApplication<Server> | undefined;

/** Boots the health module with a fake probe: no real infrastructure is contacted. */
async function createApp(
  up: readonly ('database' | 'redis' | 'storage')[],
): Promise<INestApplication<Server>> {
  const moduleRef = await Test.createTestingModule({
    imports: [TestConfigModule, HealthModule],
  })
    .overrideProvider(DependencyProbe)
    .useValue({
      database: () => Promise.resolve(up.includes('database')),
      redis: () => Promise.resolve(up.includes('redis')),
      storage: () => Promise.resolve(up.includes('storage')),
    })
    .compile();

  const created = moduleRef.createNestApplication<INestApplication<Server>>();
  await created.init();
  app = created;
  return created;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /health', () => {
  it('returns 200 and ok when every dependency is reachable', async () => {
    const nest = await createApp(['database', 'redis', 'storage']);
    const response = await request(nest.getHttpServer()).get('/health').expect(200);

    const body = healthResponseSchema.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('1.2.3');
    expect(body.dependencies).toEqual({ database: 'up', redis: 'up', storage: 'up' });
  });

  it('still returns 200 but reports degraded when infrastructure is down', async () => {
    const nest = await createApp(['redis']);
    const response = await request(nest.getHttpServer()).get('/health').expect(200);

    const body = healthResponseSchema.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.dependencies).toEqual({ database: 'down', redis: 'up', storage: 'down' });
  });
});

describe('dependency probes', () => {
  it('reports a listening TCP port as reachable and a closed one as not', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    expect(await isTcpReachable(`http://127.0.0.1:${port}`)).toBe(true);

    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
    expect(await isTcpReachable(`http://127.0.0.1:${port}`)).toBe(false);
  });

  it('treats a malformed URL as unreachable instead of throwing', async () => {
    expect(await isTcpReachable('not a url')).toBe(false);
  });

  it('reports down when a check throws or does not answer in time', async () => {
    expect(await withTimeout(Promise.reject(new Error('refused')))).toBe(false);
    expect(await withTimeout(new Promise<boolean>(() => undefined), 10)).toBe(false);
    expect(await withTimeout(Promise.resolve(true))).toBe(true);
  });
});
