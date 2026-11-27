import { createContext, useContext, useMemo } from 'react';

import type { PermissionCode } from '@fnb/contract';
import type { ReactNode } from 'react';

/** Permissions of the caller; read through `usePermission`, `Can` or `Sidebar`. */
export const PermissionContext = createContext<ReadonlySet<PermissionCode>>(new Set());

export interface PermissionProviderProps {
  /**
   * What the caller may do where they are working now (the branch chosen in the app), as computed
   * by the app from `GET /auth/me`. Nothing is granted outside a provider.
   */
  permissions: readonly PermissionCode[];
  children: ReactNode;
}

/** Supplies the caller's permissions to `Can` and `usePermission` below it (06 section 7.2). */
export function PermissionProvider({ permissions, children }: PermissionProviderProps) {
  const value = useMemo(() => new Set(permissions), [permissions]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/** True when the caller holds the permission. Hiding is a convenience; the API checks again. */
export function usePermission(code: PermissionCode): boolean {
  return useContext(PermissionContext).has(code);
}

export interface CanProps {
  permission: PermissionCode;
  /** Shown instead when the permission is missing; nothing by default. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Renders its children only when the caller holds the permission. */
export function Can({ permission, fallback = null, children }: CanProps) {
  return usePermission(permission) ? children : fallback;
}
