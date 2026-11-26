import enCommon from '../locales/en/common.json' with { type: 'json' };
import viCommon from '../locales/vi/common.json' with { type: 'json' };

import type { Locale } from '@fnb/contract';

/** Namespace used when a key has no `namespace:` prefix. */
export const DEFAULT_NAMESPACE = 'common';

/** Every namespace that has a file in `locales/<lang>/`. Add new feature namespaces here. */
export const NAMESPACES = ['common'] as const;

/** One of the translation namespaces. */
export type Namespace = (typeof NAMESPACES)[number];

/**
 * All translations, bundled. The Vietnamese files are the source of the key types;
 * `scripts/check-i18n.mjs` keeps the English files in step with them.
 */
export const resources = {
  vi: { common: viCommon },
  en: { common: enCommon },
} as const satisfies Record<Locale, Record<Namespace, unknown>>;
