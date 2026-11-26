import { Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mergeMap } from 'rxjs';

import { RequestContext } from '../../common/context/request-context.js';
import { AuditService } from './audit.service.js';

import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

const AUDITED_KEY = 'fnb:audited';

/**
 * Writes an audit row with this action once the endpoint has succeeded (CORE-40).
 * The service adds the entity and the before/after data with `AuditService.describe()`.
 */
export const Audited = (action: string): MethodDecorator => SetMetadata(AUDITED_KEY, action);

/** Reads the action an endpoint is audited as; used by tests that check sensitive endpoints. */
export const getAuditedAction = (handler: object): string | undefined => {
  const action: unknown = Reflect.getMetadata(AUDITED_KEY, handler);
  return typeof action === 'string' ? action : undefined;
};

/** Records the audit row of endpoints marked `@Audited`. A failed handler records nothing. */
@Injectable()
export class AuditedInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDITED_KEY, context.getHandler());
    if (!action || context.getType() !== 'http') {
      return next.handle();
    }
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          await this.audit.record({ action, ...RequestContext.get()?.audit });
        } catch (error) {
          // The change itself is already committed; losing the log line must be loud, not fatal.
          this.logger.error(
            `Could not write audit log for ${action}`,
            error instanceof Error ? error.stack : '',
          );
        }
        return result;
      }),
    );
  }
}
