import type { ErrorCode, ValidationIssue } from '@fnb/contract';

/**
 * HTTP status of each business error code. Typed as a full record so a new code in
 * `@fnb/contract` does not compile until it has a status here.
 */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  TOKEN_EXPIRED: 401,
  BRANCH_REQUIRED: 400,
  BRANCH_CODE_TAKEN: 409,
  BRANCH_INACTIVE: 409,
  USERNAME_TAKEN: 409,
  CANNOT_MODIFY_SELF: 409,
  ROLE_ESCALATION: 403,
  LAST_OWNER: 409,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_DISABLED: 403,
  ACCOUNT_LOCKED: 423,
  ACCOUNT_PROTECTED: 403,
  PIN_CHANGE_REQUIRED: 403,
  NOT_APPROVABLE: 400,
  APPROVAL_INVALID: 403,
  INTERNAL_ERROR: 500,
};

/** Extra facts of an error. `params` reaches the client; `cause` only reaches the log. */
export interface AppErrorOptions {
  params?: Record<string, unknown>;
  issues?: ValidationIssue[];
  cause?: unknown;
}

/**
 * A business error with a stable code. Services throw this; the exception filter turns it
 * into the error body. The message is for logs and developers, never shown to users.
 */
export class AppError extends Error {
  readonly status: number;
  readonly params?: Record<string, unknown>;
  readonly issues?: ValidationIssue[];

  constructor(
    readonly code: ErrorCode,
    message?: string,
    options: AppErrorOptions = {},
  ) {
    super(message ?? code, { cause: options.cause });
    this.name = 'AppError';
    this.status = ERROR_STATUS[code];
    this.params = options.params;
    this.issues = options.issues;
  }
}

/** The usual "row does not exist (or is not visible to this caller)" error. */
export const notFound = (entity: string, id?: string): AppError =>
  new AppError('NOT_FOUND', `${entity} not found`, { params: { entity, ...(id ? { id } : {}) } });
