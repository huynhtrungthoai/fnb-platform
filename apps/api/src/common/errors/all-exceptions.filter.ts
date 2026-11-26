import { inspect } from 'node:util';

import { Catch, HttpException, Logger } from '@nestjs/common';

import { AppError } from './app-error.js';

import type { ApiError, ErrorCode } from '@fnb/contract';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

/** Error codes for exceptions raised by the framework itself (unknown route, bad JSON, body too large). */
const HTTP_STATUS_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'VALIDATION_FAILED',
  415: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

/** What the filter decided to answer. */
export interface ErrorReply {
  status: number;
  body: ApiError;
}

/** Maps anything thrown to a status and an error body. Exported for unit tests. */
export function toErrorReply(exception: unknown, requestId?: string): ErrorReply {
  const withRequestId = requestId ? { requestId } : {};

  if (exception instanceof AppError) {
    return {
      status: exception.status,
      body: {
        error: {
          code: exception.code,
          ...(exception.params ? { params: exception.params } : {}),
          ...(exception.issues ? { issues: exception.issues } : {}),
          ...withRequestId,
        },
      },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code =
      HTTP_STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED');
    return { status, body: { error: { code, ...withRequestId } } };
  }

  // Unknown errors never leak their message to the client.
  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', ...withRequestId } } };
}

/**
 * Turns every exception into `{ error: { code, params?, issues?, requestId? } }`.
 * Server errors are logged with their stack; client errors are not (they are expected).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }
    const response = host.switchToHttp().getResponse<Response>();
    const requestIdHeader = response.getHeader('x-request-id');
    const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : undefined;
    const reply = toErrorReply(exception, requestId);

    if (reply.status >= 500) {
      const detail =
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
      this.logger.error(`${reply.body.error.code} requestId=${requestId ?? '-'} ${detail}`);
      if (exception instanceof Error && exception.cause) {
        this.logger.error(`caused by: ${inspect(exception.cause)}`);
      }
    }
    response.status(reply.status).json(reply.body);
  }
}
