import { initReactI18next } from 'react-i18next';

import { createI18n, resolveLocale } from '@fnb/i18n';

import type { Locale } from '@fnb/contract';

/** Where the chosen language is kept; on POS the language belongs to the device (plan 40 section 6). */
const STORAGE_KEY = 'fnb.pos.locale';

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the app then starts in Vietnamese.
    return null;
  }
}

/** The i18next instance of the POS app, started in the stored language. */
export const i18n = createI18n({ locale: readStoredLocale(), plugins: [initReactI18next] });

document.documentElement.lang = resolveLocale(i18n.language);

/** Switches language without a reload and remembers the choice on this device. */
export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
}
