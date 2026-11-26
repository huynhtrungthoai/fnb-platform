import enCommon from '../locales/en/common.json' with { type: 'json' };
import enDev from '../locales/en/dev.json' with { type: 'json' };
import viCommon from '../locales/vi/common.json' with { type: 'json' };
import viDev from '../locales/vi/dev.json' with { type: 'json' };

import type { Locale } from '@fnb/contract';

/** Namespace used when a key has no `namespace:` prefix. */
export const DEFAULT_NAMESPACE = 'common';

/** Every namespace that has a file in `locales/<lang>/`. Add new feature namespaces here. */
export const NAMESPACES = ['common', 'dev'] as const;

/** One of the translation namespaces. */
export type Namespace = (typeof NAMESPACES)[number];

/**
 * All translations, bundled. The Vietnamese files are the source of the key types;
 * `scripts/check-i18n.mjs` keeps the English files in step with them.
 */
export const resources = {
  // `dev` holds the labels of the development-only component sample page.
  vi: { common: viCommon, dev: viDev },
  en: { common: enCommon, dev: enDev },
} as const satisfies Record<Locale, Record<Namespace, unknown>>;
