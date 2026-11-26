import { createInstance } from 'i18next';

import { DEFAULT_LOCALE, LOCALES, localeSchema } from '@fnb/contract';

import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources.js';

import type { Locale } from '@fnb/contract';
import type { i18n as I18nInstance, Module } from 'i18next';

/** Options of `createI18n`. */
export interface CreateI18nOptions {
  /** Starting language; anything unsupported falls back to Vietnamese. */
  locale?: string | null;
  /** i18next plugins, for example `initReactI18next` in a React app. */
  plugins?: readonly Module[];
}

/** Returns the value as a supported language, or Vietnamese when it is missing or unknown. */
export function resolveLocale(value: unknown): Locale {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_LOCALE;
}

/**
 * Creates an initialized i18next instance with every bundled namespace.
 * Translations are bundled, so the instance is ready as soon as this returns.
 */
export function createI18n(options: CreateI18nOptions = {}): I18nInstance {
  const instance = createInstance();
  for (const plugin of options.plugins ?? []) {
    instance.use(plugin);
  }
  // Resources are in memory and `initAsync` is off, so init completes synchronously;
  // the returned promise only resolves the already-available `t`.
  void instance.init({
    resources,
    lng: resolveLocale(options.locale),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    initAsync: false,
    // React escapes values itself; escaping twice would show entities to the user.
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}
