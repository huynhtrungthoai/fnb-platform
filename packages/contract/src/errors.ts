import { z } from 'zod';

/**
 * Stable business error codes returned by the API (plans/40-i18n-copy.md section 5).
 * The API never returns display text: clients translate `errors:<CODE>` from `@fnb/i18n`.
 * `scripts/check-i18n.mjs` fails when a code listed here has no translation.
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'TOKEN_EXPIRED',
  'BRANCH_REQUIRED',
  'BRANCH_CODE_TAKEN',
  'BRANCH_INACTIVE',
  'INTERNAL_ERROR',
] as const;

/** Schema of a business error code. */
export const errorCodeSchema = z.enum(ERROR_CODES);

/** A business error code. */
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** One failed validation rule: where it failed and which rule, never a sentence. */
export const validationIssueSchema = z.object({
  /** Path of the field, for example `items.0.quantity`. */
  path: z.string(),
  /** Rule that failed, for example `too_small` or `invalid_format`. */
  rule: z.string(),
});

/** One failed validation rule. */
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

/** Body of every error response. */
export const apiErrorSchema = z.object({
  error: z.object({
    // A newer API may send a code this client does not know yet; it then shows the generic message.
    code: z.string(),
    /** Values for the translated message, for example `{ requiredPermission: 'user.manage' }`. */
    params: z.record(z.string(), z.unknown()).optional(),
    /** Present on `VALIDATION_FAILED`. */
    issues: z.array(validationIssueSchema).optional(),
    /** Id to quote when reporting a problem; the same id is in the server log. */
    requestId: z.string().optional(),
  }),
});

/** Body of every error response. */
export type ApiError = z.infer<typeof apiErrorSchema>;
