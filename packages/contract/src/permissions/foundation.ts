import { definePermissions } from './define.js';

/**
 * Foundation permissions (plans/06-permissions.md section 4.1, plans/10-foundation.md).
 * `printer.manage` is declared together with printers in M3 (plans/18-printing.md).
 */
export const foundationPermissions = definePermissions('foundation', {
  'branch.view': {
    scope: 'branch',
    surfaces: ['admin'],
    defaultRoles: ['manager', 'accountant'],
  },
  'branch.manage': {
    scope: 'business',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['branch.view'],
    defaultRoles: [],
  },
  'branch.settings': {
    scope: 'branch',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['branch.view'],
    defaultRoles: ['manager'],
  },
  'user.view': {
    scope: 'branch',
    surfaces: ['admin'],
    defaultRoles: ['manager', 'accountant'],
  },
  'user.manage': {
    scope: 'branch',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['user.view'],
    defaultRoles: ['manager'],
  },
  'user.reset_credentials': {
    scope: 'branch',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['user.view'],
    defaultRoles: ['manager'],
  },
  'role.view': {
    scope: 'branch',
    surfaces: ['admin'],
    defaultRoles: ['manager'],
  },
  'role.manage': {
    scope: 'business',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['role.view'],
    defaultRoles: [],
  },
  'role.assign': {
    scope: 'branch',
    surfaces: ['admin'],
    sensitive: true,
    requires: ['role.view', 'user.view'],
    defaultRoles: ['manager'],
  },
  'device.manage': {
    scope: 'branch',
    surfaces: ['admin', 'pos'],
    sensitive: true,
    defaultRoles: ['manager'],
  },
  'audit.view': {
    scope: 'branch',
    surfaces: ['admin'],
    defaultRoles: ['manager', 'accountant'],
  },
});
