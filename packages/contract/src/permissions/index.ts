import { z } from 'zod';

import { foundationPermissions } from './foundation.js';

import type {
  DefaultRoleCode,
  PermissionDefinition,
  PermissionScope,
  PermissionSurface,
} from './define.js';

export * from './define.js';
export * from './roles.js';

/**
 * Every permission declared in code: the single source of truth (D-19). The database only
 * keeps a synchronised copy. Each milestone spreads its own module file in here.
 */
export const PERMISSIONS = {
  ...foundationPermissions,
} as const;

/** A permission code. A misspelled code is a type error wherever this type is required. */
export type PermissionCode = keyof typeof PERMISSIONS;

/** Display module of a permission, the group shown on the tick screen. */
export type PermissionModule = (typeof PERMISSIONS)[PermissionCode]['module'];

/** A permission with every attribute resolved to a definite value. */
export interface Permission {
  code: PermissionCode;
  module: PermissionModule;
  scope: PermissionScope;
  surfaces: readonly PermissionSurface[];
  defaultRoles: readonly Exclude<DefaultRoleCode, 'owner'>[];
  isSensitive: boolean;
  isApprovable: boolean;
  requires: readonly PermissionCode[];
}

/** Every permission code, in declaration order. */
export const PERMISSION_CODES = Object.keys(PERMISSIONS) as PermissionCode[];

/** True when the value is a declared permission code. */
export function isPermissionCode(value: unknown): value is PermissionCode {
  return typeof value === 'string' && Object.hasOwn(PERMISSIONS, value);
}

/** Schema of a declared permission code. */
export const permissionCodeSchema = z.custom<PermissionCode>(isPermissionCode, {
  error: 'Unknown permission code',
});

/** Every permission with its attributes, in declaration order. */
export const PERMISSION_LIST: readonly Permission[] = PERMISSION_CODES.map((code) => {
  const definition: PermissionDefinition & { module: PermissionModule } = PERMISSIONS[code];
  return {
    code,
    module: definition.module,
    scope: definition.scope,
    surfaces: definition.surfaces,
    defaultRoles: definition.defaultRoles,
    isSensitive: definition.sensitive ?? false,
    isApprovable: definition.approvable ?? false,
    requires: (definition.requires ?? []).filter(isPermissionCode),
  };
});

const PERMISSION_BY_CODE = new Map(
  PERMISSION_LIST.map((permission) => [permission.code, permission]),
);

/** Attributes of one permission. */
export function getPermission(code: PermissionCode): Permission {
  const permission = PERMISSION_BY_CODE.get(code);
  if (!permission) {
    // Unreachable for a typed code; guards against a value forced past the type system.
    throw new Error(`Unknown permission code: ${code}`);
  }
  return permission;
}

/** Display modules in the order they appear on the tick screen. */
export const PERMISSION_MODULES = [
  ...new Set(PERMISSION_LIST.map((permission) => permission.module)),
] as PermissionModule[];

/** Permissions a default group holds at installation. `owner` holds all of them. */
export function defaultPermissionsOf(role: DefaultRoleCode): PermissionCode[] {
  return PERMISSION_LIST.filter(
    (permission) => role === 'owner' || permission.defaultRoles.some((code) => code === role),
  ).map((permission) => permission.code);
}

/**
 * Adds the permissions each code depends on (`requires`), transitively.
 * The tick screen and the API both use it, so a group can never hold `menu.manage` without `menu.view`.
 */
export function withRequiredPermissions(codes: Iterable<PermissionCode>): PermissionCode[] {
  const result = new Set<PermissionCode>();
  const visit = (code: PermissionCode): void => {
    if (result.has(code)) {
      return;
    }
    result.add(code);
    for (const required of getPermission(code).requires) {
      visit(required);
    }
  };
  for (const code of codes) {
    visit(code);
  }
  return PERMISSION_CODES.filter((code) => result.has(code));
}
