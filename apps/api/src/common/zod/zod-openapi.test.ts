import 'reflect-metadata';

import { Controller, Get, Module, Patch, Post } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiErrorSchema, paginationQuerySchema } from '@fnb/contract';

import { CommonModule } from '../common.module.js';
import { Public } from '../decorators/public.decorator.js';
import { buildOpenApiDocument } from '../openapi/openapi.js';
import { exploreRoutes } from '../openapi/route-explorer.js';
import { UuidParam, ZBody, ZQuery, ZResponse } from './zod.decorators.js';

import type { PaginationQuery } from '@fnb/contract';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

const createWidgetSchema = z.object({
  name: z.string().trim().min(2),
  quantity: z.number().int().min(1).default(1),
});
type CreateWidget = z.infer<typeof createWidgetSchema>;
const widgetSchema = z.object({ id: z.uuid(), name: z.string() });

@Controller('widgets')
class WidgetController {
  @Post()
  @ZResponse(widgetSchema, { summary: 'Create a widget' })
  create(@ZBody(createWidgetSchema) body: CreateWidget) {
    return body;
  }

  @Public()
  @Get()
  @ZResponse(widgetSchema, { isPage: true })
  list(@ZQuery(paginationQuerySchema) query: PaginationQuery) {
    return query;
  }

  @Patch(':id')
  rename(
    @UuidParam() id: string,
    @ZBody(createWidgetSchema.partial()) body: Partial<CreateWidget>,
  ) {
    return { id, ...body };
  }
}

@Module({ imports: [CommonModule, DiscoveryModule], controllers: [WidgetController] })
class WidgetModule {}

let app: INestApplication<Server>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [WidgetModule] }).compile();
  app = moduleRef.createNestApplication<INestApplication<Server>>();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('Zod validation', () => {
  it('passes the parsed body to the handler, with trimming and defaults applied', async () => {
    const response = await request(app.getHttpServer())
      .post('/widgets')
      .send({ name: '  Tray  ' })
      .expect(201);
    expect(response.body).toEqual({ data: { name: 'Tray', quantity: 1 } });
  });

  it('rejects a bad body with the field path and the rule, not a sentence', async () => {
    const response = await request(app.getHttpServer())
      .post('/widgets')
      .send({ name: 'x', quantity: 0 })
      .expect(400);
    const { error } = apiErrorSchema.parse(response.body);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.issues).toEqual([
      { path: 'name', rule: 'too_small' },
      { path: 'quantity', rule: 'too_small' },
    ]);
  });

  it('coerces and validates the query string', async () => {
    const ok = await request(app.getHttpServer()).get('/widgets?page=3').expect(200);
    expect(ok.body).toEqual({ data: { page: 3, pageSize: 20 } });
    const bad = await request(app.getHttpServer()).get('/widgets?pageSize=1000').expect(400);
    expect(apiErrorSchema.parse(bad.body).error.issues?.[0]?.path).toBe('pageSize');
  });

  it('rejects a route parameter that is not a UUID', async () => {
    await request(app.getHttpServer()).patch('/widgets/not-a-uuid').send({}).expect(400);
    await request(app.getHttpServer())
      .patch('/widgets/019323f0-0000-7000-8000-000000000001')
      .send({ name: 'Box' })
      .expect(200);
  });
});

describe('OpenAPI document', () => {
  it('describes every route with schemas taken from Zod', () => {
    const routes = exploreRoutes(app.get(DiscoveryService));
    expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /widgets',
      'POST /widgets',
      'PATCH /widgets/:id',
    ]);

    const document = buildOpenApiDocument(routes, { title: 'Test', version: '1.0.0' }, () => ({
      'x-extended': true,
    }));
    expect(document).toMatchObject({
      openapi: '3.1.0',
      paths: {
        '/widgets': {
          post: {
            summary: 'Create a widget',
            security: [{ bearerAuth: [] }],
            'x-extended': true,
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: { name: { type: 'string', minLength: 2 } },
                  },
                },
              },
            },
          },
          get: {
            security: [],
            parameters: [
              { name: 'page', in: 'query', required: false },
              { name: 'pageSize', in: 'query', required: false },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { properties: { meta: { $ref: '#/components/schemas/PageMeta' } } },
                  },
                },
              },
            },
          },
        },
        '/widgets/{id}': {
          patch: { parameters: [{ name: 'id', in: 'path', schema: { format: 'uuid' } }] },
        },
      },
    });
  });
});
