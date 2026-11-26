import { Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs';

import { Paginated } from './pagination.js';

import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

const RAW_RESPONSE_KEY = 'fnb:rawResponse';

/**
 * Sends the handler's return value as it is, without the `{ data }` envelope.
 * Only for endpoints read by tools with their own format (`/health`, `/openapi.json`, file streams).
 */
export const RawResponse = (): MethodDecorator => SetMetadata(RAW_RESPONSE_KEY, true);

/** Wraps a handler result in the common response format. Exported for unit tests. */
export function toEnvelope(result: unknown): unknown {
  if (result instanceof Paginated) {
    return { data: result.items, meta: result.meta };
  }
  return { data: result ?? null };
}

/** Applies the common response format to every HTTP endpoint: `{ data }` or `{ data, meta }`. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const isRaw = this.reflector.get<boolean | undefined>(RAW_RESPONSE_KEY, context.getHandler());
    return isRaw ? next.handle() : next.handle().pipe(map(toEnvelope));
  }
}
