import {
  IS_AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSION_KEY,
} from '../decorators/access.decorators.js';

import type { RequiredPermission } from '../decorators/access.decorators.js';
import type { RouteInfo } from './route-explorer.js';

/** The access rule an endpoint declares; `none` means it is closed by default-deny. */
export type AccessRule =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'permission'; permission: RequiredPermission }
  | { kind: 'none' };

/**
 * Reads which of `@Public`, `@Authenticated` or `@RequirePermission` an endpoint declares.
 * Shared by the OpenAPI document and `route-permissions.test.ts`.
 */
export function describeAccessRule(
  route: Pick<RouteInfo, 'handler' | 'controllerClass'>,
): AccessRule {
  if (
    Reflect.getMetadata(IS_PUBLIC_KEY, route.handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, route.controllerClass) === true
  ) {
    return { kind: 'public' };
  }
  const permission: unknown = Reflect.getMetadata(REQUIRED_PERMISSION_KEY, route.handler);
  if (permission) {
    return { kind: 'permission', permission: permission as RequiredPermission };
  }
  if (Reflect.getMetadata(IS_AUTHENTICATED_KEY, route.handler) === true) {
    return { kind: 'authenticated' };
  }
  return { kind: 'none' };
}
