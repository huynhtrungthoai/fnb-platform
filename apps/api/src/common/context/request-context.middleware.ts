import { Injectable, Logger } from '@nestjs/common';

import { uuidv7 } from '@fnb/utils';

import { RequestContext } from './request-context.js';

import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Header that carries the request id in both directions. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** An id sent by a client or proxy is kept only when it looks like one; anything else is replaced. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Picks the incoming request id when it is safe to log, otherwise generates one. */
export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : uuidv7();
}

/**
 * Opens the per-request context (request id, client IP), echoes the id in the response header
 * and writes one access-log line when the response is sent.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Http');

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);
    const startedAt = performance.now();
    response.setHeader(REQUEST_ID_HEADER, requestId);

    RequestContext.run({ requestId, ip: request.ip ?? null }, () => {
      response.on('finish', () => {
        const durationMs = Math.round(performance.now() - startedAt);
        // The path only: query strings can carry personal data.
        const path = request.originalUrl.split('?')[0] ?? '';
        this.logger.log(`${request.method} ${path} ${response.statusCode} ${durationMs}ms`);
      });
      next();
    });
  }
}
