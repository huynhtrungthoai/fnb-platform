import { z } from 'zod';

import { apiErrorSchema, pageMetaSchema } from '@fnb/contract';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { getHandlerSchemas } from '../zod/zod.decorators.js';

import type { RouteInfo } from './route-explorer.js';

type JsonObject = Record<string, unknown>;

/** Hook that lets a later layer (permissions) add fields to an operation. */
export type OperationExtender = (route: RouteInfo) => JsonObject;

const toInputSchema = (schema: z.ZodType): JsonObject =>
  // Schemas that cannot be expressed in JSON Schema (transforms) are documented as "any".
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any', target: 'draft-2020-12' });

const toOutputSchema = (schema: z.ZodType): JsonObject =>
  z.toJSONSchema(schema, { io: 'output', unrepresentable: 'any', target: 'draft-2020-12' });

function withoutMeta(schema: JsonObject): JsonObject {
  const { $schema: _ignored, ...rest } = schema;
  return rest;
}

/** `:id` in Nest becomes `{id}` in OpenAPI. */
const toOpenApiPath = (path: string): string => path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1] ?? '');
}

function queryParameters(schema: z.ZodType): JsonObject[] {
  const json = toInputSchema(schema);
  const properties = (json.properties ?? {}) as Record<string, JsonObject>;
  const required = Array.isArray(json.required) ? (json.required as unknown[]) : [];
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: property,
  }));
}

function buildOperation(route: RouteInfo, extend: OperationExtender): JsonObject {
  const schemas = getHandlerSchemas(route.handler);
  const isPublic =
    Reflect.getMetadata(IS_PUBLIC_KEY, route.handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, route.controllerClass) === true;

  const parameters: JsonObject[] = pathParameterNames(route.path).map((name) => {
    const schema = schemas.params?.[name];
    return {
      name,
      in: 'path',
      required: true,
      schema: schema ? withoutMeta(toInputSchema(schema)) : { type: 'string' },
    };
  });
  if (schemas.query) {
    parameters.push(...queryParameters(schemas.query));
  }

  const data = schemas.response ? withoutMeta(toOutputSchema(schemas.response)) : {};
  const success = schemas.isPage
    ? {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: data },
          meta: { $ref: '#/components/schemas/PageMeta' },
        },
      }
    : { type: 'object', required: ['data'], properties: { data } };

  return {
    operationId: `${route.controllerName}.${route.handlerName}`,
    tags: [route.controllerName.replace(/Controller$/, '')],
    ...(schemas.summary ? { summary: schemas.summary } : {}),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(schemas.body
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: withoutMeta(toInputSchema(schemas.body)) } },
          },
        }
      : {}),
    responses: {
      200: { description: 'Success', content: { 'application/json': { schema: success } } },
      default: {
        description: 'Error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
    },
    security: isPublic ? [] : [{ bearerAuth: [] }],
    ...extend(route),
  };
}

/**
 * Builds the OpenAPI 3.1 document from the routes and the Zod schemas declared on them (D-10).
 * Request and response shapes come from `z.toJSONSchema`, so the document cannot drift from validation.
 */
export function buildOpenApiDocument(
  routes: readonly RouteInfo[],
  info: { title: string; version: string },
  extend: OperationExtender = () => ({}),
): JsonObject {
  const paths: Record<string, JsonObject> = {};
  for (const route of routes) {
    const path = toOpenApiPath(route.path);
    paths[path] = { ...paths[path], [route.method.toLowerCase()]: buildOperation(route, extend) };
  }
  return {
    openapi: '3.1.0',
    info,
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        ApiError: withoutMeta(toOutputSchema(apiErrorSchema)),
        PageMeta: withoutMeta(toOutputSchema(pageMetaSchema)),
      },
    },
  };
}
