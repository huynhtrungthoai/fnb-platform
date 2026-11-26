import { Body, Param, Query } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

/** Metadata key under which a handler's schemas are kept for the OpenAPI document. */
export const ZOD_SCHEMAS_KEY = 'fnb:zodSchemas';

/** Schemas declared on one handler. */
export interface HandlerSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: Record<string, z.ZodType>;
  response?: z.ZodType;
  /** The response is a page: `{ data: response[], meta }`. */
  isPage?: boolean;
  summary?: string;
}

/** Reads the schemas declared on a handler. */
export function getHandlerSchemas(handler: object): HandlerSchemas {
  const stored: unknown = Reflect.getMetadata(ZOD_SCHEMAS_KEY, handler);
  return (stored as HandlerSchemas | undefined) ?? {};
}

function mergeHandlerSchemas(handler: object, patch: HandlerSchemas): void {
  const current = getHandlerSchemas(handler);
  Reflect.defineMetadata(
    ZOD_SCHEMAS_KEY,
    { ...current, ...patch, params: { ...current.params, ...patch.params } },
    handler,
  );
}

/** The method a parameter decorator sits on. */
function handlerOf(target: object, key: string | symbol | undefined): object | undefined {
  if (key === undefined) {
    return undefined;
  }
  const handler: unknown = Reflect.get(target, key);
  return typeof handler === 'function' ? handler : undefined;
}

/** Request body, validated and typed by the schema; also documents it in OpenAPI. */
export function ZBody(schema: z.ZodType): ParameterDecorator {
  return (target, key, index) => {
    const handler = handlerOf(target, key);
    if (handler) {
      mergeHandlerSchemas(handler, { body: schema });
    }
    Body(new ZodValidationPipe(schema))(target, key, index);
  };
}

/** Query string, validated and typed by the schema; also documents it in OpenAPI. */
export function ZQuery(schema: z.ZodType): ParameterDecorator {
  return (target, key, index) => {
    const handler = handlerOf(target, key);
    if (handler) {
      mergeHandlerSchemas(handler, { query: schema });
    }
    Query(new ZodValidationPipe(schema))(target, key, index);
  };
}

/** One route parameter, validated by the schema. */
export function ZParam(name: string, schema: z.ZodType): ParameterDecorator {
  return (target, key, index) => {
    const handler = handlerOf(target, key);
    if (handler) {
      mergeHandlerSchemas(handler, { params: { [name]: schema } });
    }
    Param(name, new ZodValidationPipe(schema))(target, key, index);
  };
}

const uuidSchema = z.uuid();

/** A route parameter that must be a UUID, the id format of every table. */
export const UuidParam = (name = 'id'): ParameterDecorator => ZParam(name, uuidSchema);

/** Documents the shape of `data` in the response. Does not validate the handler's result. */
export function ZResponse(
  schema: z.ZodType,
  options: { isPage?: boolean; summary?: string } = {},
): MethodDecorator {
  return (_target, _key, descriptor) => {
    const handler: unknown = descriptor.value;
    if (typeof handler === 'function') {
      mergeHandlerSchemas(handler, { response: schema, ...options });
    }
  };
}
