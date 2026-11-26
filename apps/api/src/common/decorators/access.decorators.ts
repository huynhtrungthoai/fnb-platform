import { createParamDecorator, SetMetadata } from '@nestjs/common';

import { AppError } from '../errors/app-error.js';

import type { GrantedApproval } from '../../modules/approvals/approvals.service.js';
import type { EffectiveAccess, UserAccess } from '../../modules/rbac/access.js';
import type { PermissionCode } from '@fnb/contract';
import type { ExecutionContext } from '@nestjs/common';

export { IS_PUBLIC_KEY, Public } from './public.decorator.js';

/** Metadata key of `@RequirePermission`. */
export const REQUIRED_PERMISSION_KEY = 'fnb:requiredPermission';
/** Metadata key of `@AllowTemporaryPin`. */
export const ALLOWS_TEMPORARY_PIN_KEY = 'fnb:allowsTemporaryPin';
/** Metadata key of `@Authenticated`. */
export const IS_AUTHENTICATED_KEY = 'fnb:isAuthenticated';

/** Header that names the branch a request works in. */
export const BRANCH_HEADER = 'x-branch-id';

/**
 * Where the branch of a request comes from:
 *  - `header` (default): the `X-Branch-Id` header, the branch chosen in the app
 *  - `{ param }`: a route parameter, for endpoints about one branch (`/branches/:id`)
 *  - `any`: the permission at any branch is enough; the service filters rows by the caller's reach
 */
export type BranchSource = 'header' | 'any' | { param: string };

/** What `@RequirePermission` stores on a handler. */
export interface RequiredPermission {
  code: PermissionCode;
  branch: BranchSource;
}

/**
 * The endpoint needs this permission at the branch of the request (06 section 7.1).
 * For a `business` permission the branch is ignored: it must come from an all-branches assignment.
 */
export const RequirePermission = (
  code: PermissionCode,
  options: { branch?: BranchSource } = {},
): MethodDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, {
    code,
    branch: options.branch ?? 'header',
  } satisfies RequiredPermission);

/** The endpoint only needs a signed-in caller, for example to read the caller's own profile. */
export const Authenticated = (): MethodDecorator => SetMetadata(IS_AUTHENTICATED_KEY, true);

/**
 * The endpoint stays open to a session whose PIN is temporary (D-29). Every other endpoint
 * answers `403 PIN_CHANGE_REQUIRED` until the PIN is changed.
 */
export const AllowTemporaryPin = (): MethodDecorator => SetMetadata(ALLOWS_TEMPORARY_PIN_KEY, true);

/** Who is calling and where, as established by the access guard. */
export interface AuthContext {
  userId: string;
  sessionId: string;
  /** Set for a staff session on a registered POS device. */
  deviceId?: string;
  /** Branch of the request, once the guard has checked that the caller is assigned there. */
  branchId?: string;
  /** Access at `branchId`. */
  effective?: EffectiveAccess;
  /** Every assignment of the caller. */
  access: UserAccess;
  /** Set when the permission came from an on-the-spot approval rather than the caller's group. */
  approval?: GrantedApproval;
}

/** Request with the context the access guard attaches. */
export interface AuthenticatedRequest {
  auth?: AuthContext;
}

/** Injects the caller's context. Only valid on endpoints that are not `@Public`. */
export const Auth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) {
      throw new AppError('UNAUTHENTICATED', 'No authenticated caller on this request');
    }
    return auth;
  },
);

/** The branch of the request; throws `BRANCH_REQUIRED` when the endpoint ran without one. */
export function requireBranchId(auth: AuthContext): string {
  if (!auth.branchId) {
    throw new AppError('BRANCH_REQUIRED', 'This action needs a branch');
  }
  return auth.branchId;
}
