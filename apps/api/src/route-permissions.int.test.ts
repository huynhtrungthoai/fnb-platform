import { DiscoveryService } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorSchema, isPermissionCode, PERMISSION_CODES } from '@fnb/contract';
import { uuidv7 } from '@fnb/utils';

import { describeAccessRule } from './common/openapi/access-rule.js';
import { exploreRoutes } from './common/openapi/route-explorer.js';
import { assignRole, createBranch, createCustomRole, openSession } from './test/auth-helpers.js';
import { createTestApp } from './test/test-app.js';

import type { RequiredPermission } from './common/decorators/access.decorators.js';
import type { RouteInfo } from './common/openapi/route-explorer.js';
import type { TestSession } from './test/auth-helpers.js';
import type { TestApp } from './test/test-app.js';
import type { Response } from 'supertest';

/**
 * Every endpoint declares who may call it (06 section 11, M1-24). A new `@Public` endpoint must be
 * added here on purpose, so opening an endpoint to everyone is always a reviewed change.
 */
const PUBLIC_ROUTES = [
  'GET /devices/staff',
  'GET /health',
  'GET /media/:id/content',
  'GET /openapi.json',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /devices/session',
];

let test: TestApp;
let routes: RouteInfo[];

beforeAll(async () => {
  test = await createTestApp();
  routes = exploreRoutes(test.app.get(DiscoveryService));
});

afterAll(async () => {
  await test.close();
});

const label = (route: RouteInfo): string => `${route.method} ${route.path}`;

function permissionOf(route: RouteInfo): RequiredPermission | null {
  const rule = describeAccessRule(route);
  return rule.kind === 'permission' ? rule.permission : null;
}

/** Fills every route parameter; the branch parameter gets `branchId`, the others a fresh id. */
function concretePath(route: RouteInfo, branchId: string): string {
  const branchParam = permissionOf(route)?.branch;
  const branchParamName = typeof branchParam === 'object' ? branchParam.param : null;
  return route.path.replace(/:(\w+)/g, (_match, name: string) =>
    name === branchParamName ? branchId : uuidv7(),
  );
}

function send(route: RouteInfo, path: string, headers: Record<string, string>): Promise<Response> {
  const method = route.method.toLowerCase();
  if (
    method !== 'get' &&
    method !== 'post' &&
    method !== 'put' &&
    method !== 'patch' &&
    method !== 'delete'
  ) {
    throw new Error(`Unexpected method ${route.method}`);
  }
  return test.http[method](path).set(headers).send({});
}

function errorCode(response: Response): string | undefined {
  return apiErrorSchema.safeParse(response.body).data?.error.code;
}

describe('route declarations', () => {
  it('finds the endpoints of the application', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it('declares @Public, @Authenticated or @RequirePermission on every endpoint', () => {
    const undeclared = routes.filter((route) => describeAccessRule(route).kind === 'none');
    expect(undeclared.map(label)).toEqual([]);
  });

  it('opens only the reviewed endpoints to everyone', () => {
    const open = routes.filter((route) => describeAccessRule(route).kind === 'public');
    expect(open.map(label).sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('requires only declared permission codes, with a branch parameter that exists', () => {
    const problems = routes.flatMap((route) => {
      const permission = permissionOf(route);
      if (!permission) {
        return [];
      }
      if (!isPermissionCode(permission.code)) {
        return [`${label(route)}: unknown permission ${String(permission.code)}`];
      }
      const branch = permission.branch;
      if (typeof branch === 'object' && !route.path.includes(`:${branch.param}`)) {
        return [`${label(route)}: no route parameter :${branch.param}`];
      }
      return [];
    });
    expect(problems).toEqual([]);
  });
});

describe('route enforcement', () => {
  let branchA: string;
  let branchB: string;
  /** Assigned at branch A with a group that holds nothing. */
  let powerless: TestSession;
  /** Assigned at branch A only, with a group that holds every permission. */
  let branchAOnly: TestSession;

  beforeEach(async () => {
    await test.reset();
    branchA = await createBranch(test, 'A');
    branchB = await createBranch(test, 'B');

    const emptyRole = await createCustomRole(test, 'Empty', []);
    const fullRole = await createCustomRole(test, 'Full', PERMISSION_CODES);
    const powerlessId = uuidv7();
    const branchAOnlyId = uuidv7();
    await assignRole(test, { userId: powerlessId, branchId: branchA, roleId: emptyRole });
    await assignRole(test, { userId: branchAOnlyId, branchId: branchA, roleId: fullRole });
    powerless = await openSession(test, powerlessId);
    branchAOnly = await openSession(test, branchAOnlyId);
  });

  it('answers 401 to a caller without a token on every endpoint that is not public', async () => {
    const failures: string[] = [];
    for (const route of routes) {
      if (describeAccessRule(route).kind === 'public') {
        continue;
      }
      const response = await send(route, concretePath(route, branchA), {});
      if (response.status !== 401) {
        failures.push(`${label(route)} → ${response.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('answers 403 PERMISSION_DENIED to a caller whose group lacks the permission', async () => {
    const failures: string[] = [];
    for (const route of routes) {
      if (!permissionOf(route)) {
        continue;
      }
      const response = await send(route, concretePath(route, branchA), powerless.headers(branchA));
      if (response.status !== 403 || errorCode(response) !== 'PERMISSION_DENIED') {
        failures.push(`${label(route)} → ${response.status} ${errorCode(response) ?? ''}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('answers 403 at a branch where the caller holds the permission nowhere', async () => {
    const failures: string[] = [];
    for (const route of routes) {
      const permission = permissionOf(route);
      // `branch: 'any'` endpoints accept the permission at any branch; the service filters rows.
      if (!permission || permission.branch === 'any') {
        continue;
      }
      const response = await send(
        route,
        concretePath(route, branchB),
        branchAOnly.headers(branchB),
      );
      if (response.status !== 403 || errorCode(response) !== 'PERMISSION_DENIED') {
        failures.push(`${label(route)} → ${response.status} ${errorCode(response) ?? ''}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
