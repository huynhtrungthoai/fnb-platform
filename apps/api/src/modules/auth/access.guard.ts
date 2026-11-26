import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';

import { getPermission } from '@fnb/contract';

import { RequestContext } from '../../common/context/request-context.js';
import {
  BRANCH_HEADER,
  IS_AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSION_KEY,
} from '../../common/decorators/access.decorators.js';
import { AppError } from '../../common/errors/app-error.js';
import { branchReach, reachesAnyBranch, resolveEffectiveAccess } from '../rbac/access.js';
import { permissionDenied, RbacService } from '../rbac/rbac.service.js';
import { AccessTokenService } from './session/access-token.service.js';
import { SessionStore } from './session/session-store.js';

import type {
  AuthContext,
  AuthenticatedRequest,
  RequiredPermission,
} from '../../common/decorators/access.decorators.js';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const branchIdSchema = z.uuid();

/** Reads the bearer token of a request, if any. */
export function extractBearerToken(authorization: string | undefined): string | null {
  const [scheme, token] = (authorization ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * The default-deny guard of every endpoint (CORE-23, 06 section 7.1). In order:
 *  1. the endpoint must declare `@Public`, `@Authenticated` or `@RequirePermission`; otherwise it is refused
 *  2. authentication: a valid access token whose session is still active
 *  3. the branch of the request
 *  4. the caller is assigned at that branch
 *  5. the caller's group holds the permission, with the right scope
 * Limits are checked later in the service, because they need business data.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
    private readonly sessions: SessionStore,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const required = this.reflector.get<RequiredPermission | undefined>(
      REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );
    const isAuthenticatedOnly = this.reflector.get<boolean | undefined>(
      IS_AUTHENTICATED_KEY,
      context.getHandler(),
    );
    if (!required && !isAuthenticatedOnly) {
      // Default deny: an endpoint nobody declared access for is closed to everyone.
      throw new AppError('PERMISSION_DENIED', 'Endpoint declares no access rule');
    }

    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const auth = await this.authenticate(request);
    request.auth = auth;
    RequestContext.assign({ userId: auth.userId, deviceId: auth.deviceId });

    if (required) {
      this.authorize(auth, required, request);
    } else {
      // Optional branch for signed-in-only endpoints: accepted only where the caller is assigned.
      const branchId = this.readBranchId(request, 'header', false);
      if (branchId) {
        this.enterBranch(auth, branchId);
      }
    }
    RequestContext.assign({ branchId: auth.branchId });
    return true;
  }

  private async authenticate(request: Request): Promise<AuthContext> {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new AppError('UNAUTHENTICATED', 'Missing bearer token');
    }
    const claims = await this.tokens.verify(token);
    if (!(await this.sessions.isActive(claims.sessionId, claims.userId))) {
      // Same code as an expired token: the client tries a refresh, which fails if the session was revoked.
      throw new AppError('TOKEN_EXPIRED', 'Session is no longer active');
    }
    return {
      userId: claims.userId,
      sessionId: claims.sessionId,
      ...(claims.deviceId ? { deviceId: claims.deviceId } : {}),
      access: await this.rbac.getUserAccess(claims.userId),
    };
  }

  private authorize(auth: AuthContext, required: RequiredPermission, request: Request): void {
    const permission = getPermission(required.code);

    if (permission.scope === 'business') {
      // Business permissions only count on an all-branches assignment (06 section 3.4).
      if (!reachesAnyBranch(branchReach(auth.access, required.code))) {
        throw permissionDenied(required.code);
      }
      const branchId = this.readBranchId(
        request,
        required.branch === 'any' ? 'header' : required.branch,
        false,
      );
      if (branchId) {
        this.enterBranch(auth, branchId);
      }
      return;
    }

    if (required.branch === 'any') {
      if (!reachesAnyBranch(branchReach(auth.access, required.code))) {
        throw permissionDenied(required.code);
      }
      return;
    }

    const branchId = this.readBranchId(request, required.branch, true);
    const effective = branchId ? resolveEffectiveAccess(auth.access, branchId) : null;
    if (!branchId || !effective?.permissions.includes(required.code)) {
      throw permissionDenied(required.code);
    }
    auth.branchId = branchId;
    auth.effective = effective;
  }

  /** Sets the branch of the request when the caller is assigned there; refuses otherwise. */
  private enterBranch(auth: AuthContext, branchId: string): void {
    const effective = resolveEffectiveAccess(auth.access, branchId);
    if (!effective) {
      throw new AppError('PERMISSION_DENIED', 'Caller is not assigned at this branch', {
        params: { branchId },
      });
    }
    auth.branchId = branchId;
    auth.effective = effective;
  }

  private readBranchId(
    request: Request,
    source: 'header' | { param: string },
    isRequired: boolean,
  ): string | undefined {
    const raw: unknown =
      source === 'header' ? request.headers[BRANCH_HEADER] : request.params[source.param];
    if (raw === undefined || raw === '') {
      if (isRequired) {
        throw new AppError('BRANCH_REQUIRED', 'This endpoint needs a branch');
      }
      return undefined;
    }
    const parsed = branchIdSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError('VALIDATION_FAILED', 'Branch id is not a UUID', {
        issues: [
          { path: source === 'header' ? BRANCH_HEADER : source.param, rule: 'invalid_format' },
        ],
      });
    }
    return parsed.data;
  }
}
