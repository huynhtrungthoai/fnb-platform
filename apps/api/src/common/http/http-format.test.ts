import 'reflect-metadata';

import { Controller, Get, Module, PayloadTooLargeException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorSchema,
  apiPageSchema,
  apiSuccessSchema,
  paginationQuerySchema,
} from '@fnb/contract';

import { CommonModule } from '../common.module.js';
import { toErrorReply } from '../errors/all-exceptions.filter.js';
import { AppError, notFound } from '../errors/app-error.js';
import { Paginated, toLimitOffset } from './pagination.js';
import { RawResponse } from './response.interceptor.js';

import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

@Controller('samples')
class SampleController {
  @Get('one')
  one() {
    return { id: 'a' };
  }

  @Get('nothing')
  nothing() {
    return undefined;
  }

  @Get('page')
  page() {
    const query = paginationQuerySchema.parse({ page: '2', pageSize: '2' });
    return new Paginated([{ id: 'c' }, { id: 'd' }], 5, query).map((row) => ({ ...row, ok: true }));
  }

  @RawResponse()
  @Get('raw')
  raw() {
    return { status: 'ok' };
  }

  @Get('missing')
  missing() {
    throw notFound('sample', 'x1');
  }

  @Get('denied')
  denied() {
    throw new AppError('PERMISSION_DENIED', 'no', {
      params: { requiredPermission: 'user.manage' },
    });
  }

  @Get('crash')
  crash() {
    throw new Error('database password is hunter2');
  }

  @Get('too-large')
  tooLarge() {
    throw new PayloadTooLargeException();
  }
}

@Module({ imports: [CommonModule], controllers: [SampleController] })
class SampleModule {}

let app: INestApplication<Server>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [SampleModule] }).compile();
  app = moduleRef.createNestApplication<INestApplication<Server>>();
  app.useLogger(false);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('response format', () => {
  it('wraps a single value in { data }', async () => {
    const response = await request(app.getHttpServer()).get('/samples/one').expect(200);
    expect(apiSuccessSchema(z.object({ id: z.string() })).parse(response.body).data.id).toBe('a');
  });

  it('sends { data: null } when the handler returns nothing', async () => {
    const response = await request(app.getHttpServer()).get('/samples/nothing').expect(200);
    expect(response.body).toEqual({ data: null });
  });

  it('sends a page as { data, meta }', async () => {
    const response = await request(app.getHttpServer()).get('/samples/page').expect(200);
    const body = apiPageSchema(z.object({ id: z.string(), ok: z.boolean() })).parse(response.body);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('leaves a raw response untouched', async () => {
    const response = await request(app.getHttpServer()).get('/samples/raw').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('error format', () => {
  it('returns the business code and params of an AppError', async () => {
    const missing = await request(app.getHttpServer()).get('/samples/missing').expect(404);
    expect(apiErrorSchema.parse(missing.body).error).toMatchObject({
      code: 'NOT_FOUND',
      params: { entity: 'sample', id: 'x1' },
    });

    const denied = await request(app.getHttpServer()).get('/samples/denied').expect(403);
    expect(apiErrorSchema.parse(denied.body).error).toMatchObject({
      code: 'PERMISSION_DENIED',
      params: { requiredPermission: 'user.manage' },
    });
  });

  it('answers an unknown route with NOT_FOUND', async () => {
    const response = await request(app.getHttpServer()).get('/nowhere').expect(404);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('NOT_FOUND');
  });

  it('hides the message of an unexpected error', async () => {
    const response = await request(app.getHttpServer()).get('/samples/crash').expect(500);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('INTERNAL_ERROR');
    expect(apiErrorSchema.parse(response.body).error.params).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
  });

  it('maps framework exceptions to a code and keeps their status', async () => {
    const response = await request(app.getHttpServer()).get('/samples/too-large').expect(413);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
  });

  it('adds the request id and validation issues when present', () => {
    const reply = toErrorReply(
      new AppError('VALIDATION_FAILED', 'bad', { issues: [{ path: 'name', rule: 'too_small' }] }),
      'req-1',
    );
    expect(reply).toEqual({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          issues: [{ path: 'name', rule: 'too_small' }],
          requestId: 'req-1',
        },
      },
    });
  });
});

describe('pagination', () => {
  it('defaults to page 1 with 20 rows and caps the page size', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('converts a page to limit and offset', () => {
    expect(toLimitOffset({ page: 3, pageSize: 25 })).toEqual({ limit: 25, offset: 50 });
  });
});
