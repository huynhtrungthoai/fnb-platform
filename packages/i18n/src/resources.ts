import enAdmin from '../locales/en/admin.json' with { type: 'json' };
import enAudit from '../locales/en/audit.json' with { type: 'json' };
import enBranches from '../locales/en/branches.json' with { type: 'json' };
import enCommon from '../locales/en/common.json' with { type: 'json' };
import enDev from '../locales/en/dev.json' with { type: 'json' };
import enDevices from '../locales/en/devices.json' with { type: 'json' };
import enErrors from '../locales/en/errors.json' with { type: 'json' };
import enPermissions from '../locales/en/permissions.json' with { type: 'json' };
import enRoles from '../locales/en/roles.json' with { type: 'json' };
import enStaff from '../locales/en/staff.json' with { type: 'json' };
import viAdmin from '../locales/vi/admin.json' with { type: 'json' };
import viAudit from '../locales/vi/audit.json' with { type: 'json' };
import viBranches from '../locales/vi/branches.json' with { type: 'json' };
import viCommon from '../locales/vi/common.json' with { type: 'json' };
import viDev from '../locales/vi/dev.json' with { type: 'json' };
import viDevices from '../locales/vi/devices.json' with { type: 'json' };
import viErrors from '../locales/vi/errors.json' with { type: 'json' };
import viPermissions from '../locales/vi/permissions.json' with { type: 'json' };
import viRoles from '../locales/vi/roles.json' with { type: 'json' };
import viStaff from '../locales/vi/staff.json' with { type: 'json' };

import type { Locale } from '@fnb/contract';

/** Namespace used when a key has no `namespace:` prefix. */
export const DEFAULT_NAMESPACE = 'common';

/** Every namespace that has a file in `locales/<lang>/`. Add new feature namespaces here. */
export const NAMESPACES = [
  'admin',
  'audit',
  'branches',
  'common',
  'dev',
  'devices',
  'errors',
  'permissions',
  'roles',
  'staff',
] as const;

/** One of the translation namespaces. */
export type Namespace = (typeof NAMESPACES)[number];

/**
 * All translations, bundled. The Vietnamese files are the source of the key types;
 * `scripts/check-i18n.mjs` keeps the English files in step with them.
 */
export const resources = {
  // `admin` holds the shell, sign-in and overview of the Admin app; feature screens get their own.
  // `dev` holds the labels of the development-only component sample page.
  // `permissions` has `codes.<module>.<action>.name|description` for every permission code (06 section 3.1).
  // `errors` has one key per error code of `@fnb/contract`, plus `generic` and `network`.
  vi: {
    admin: viAdmin,
    audit: viAudit,
    branches: viBranches,
    common: viCommon,
    dev: viDev,
    devices: viDevices,
    errors: viErrors,
    permissions: viPermissions,
    roles: viRoles,
    staff: viStaff,
  },
  en: {
    admin: enAdmin,
    audit: enAudit,
    branches: enBranches,
    common: enCommon,
    dev: enDev,
    devices: enDevices,
    errors: enErrors,
    permissions: enPermissions,
    roles: enRoles,
    staff: enStaff,
  },
} as const satisfies Record<Locale, Record<Namespace, unknown>>;
