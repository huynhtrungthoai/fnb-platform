import { AppError } from '../errors/app-error.js';

import type { ValidationIssue } from '@fnb/contract';
import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Converts Zod issues to `{ path, rule }` pairs: where it failed and which rule, never a sentence. */
export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), rule: issue.code }));
}

/**
 * Parses one request part (body, query or a route parameter) with a Zod schema (D-10).
 * The handler receives the parsed value, so defaults and coercions of the schema apply.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError('VALIDATION_FAILED', 'Request validation failed', {
        issues: toValidationIssues(result.error),
      });
    }
    return result.data;
  }
}
