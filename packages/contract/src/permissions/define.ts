/** Where a permission takes effect (plans/06-permissions.md section 3.1). */
export type PermissionScope = 'branch' | 'business';

/** App surfaces a permission is used on; filters the tick screen. */
export type PermissionSurface = 'admin' | 'pos' | 'kds';

/**
 * Codes of the seven default permission groups. `owner` always holds every permission,
 * so it is never listed in `defaultRoles`.
 */
export const DEFAULT_ROLE_CODES = [
  'owner',
  'manager',
  'cashier',
  'staff',
  'kitchen',
  'stock_keeper',
  'accountant',
] as const;

/** Code of a default permission group. */
export type DefaultRoleCode = (typeof DEFAULT_ROLE_CODES)[number];

/** What a feature declares for each of its permissions. */
export interface PermissionDefinition {
  /** `branch`: effective in the assigned branch. `business`: only for an all-branches assignment. */
  scope: PermissionScope;
  surfaces: readonly PermissionSurface[];
  /** Default groups that hold this permission at installation; `owner` is implied. */
  defaultRoles: readonly Exclude<DefaultRoleCode, 'owner'>[];
  /** Always audited, shown with a warning label on the tick screen. */
  sensitive?: boolean;
  /** A user without it may ask someone who has it to approve on the spot with a PIN. */
  approvable?: boolean;
  /** Permissions that must be held together with this one. */
  requires?: readonly string[];
}

/** A permission code: `module.action`. */
export type PermissionCodeShape = `${string}.${string}`;

/**
 * Declares the permissions of one display module. The result keeps the literal codes,
 * from which the `PermissionCode` union is built.
 */
export function definePermissions<
  const M extends string,
  const T extends Record<PermissionCodeShape, PermissionDefinition>,
>(module: M, definitions: T): { [K in keyof T]: T[K] & { code: K; module: M } } {
  const entries = Object.entries(definitions).map(([code, definition]) => [
    code,
    { ...definition, code, module },
  ]);
  return Object.fromEntries(entries) as { [K in keyof T]: T[K] & { code: K; module: M } };
}
