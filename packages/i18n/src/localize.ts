import type { Locale, LocalizedText } from '@fnb/contract';

/**
 * Picks the display name of catalog data for a language, falling back to Vietnamese when
 * the English value is missing or blank (plans/40-i18n-copy.md section 4). A missing value
 * yields an empty string so a screen never crashes on incomplete data.
 */
export function localize(value: LocalizedText | null | undefined, locale: Locale): string {
  const preferred = value?.[locale]?.trim();
  if (preferred) {
    return preferred;
  }
  return value?.vi?.trim() ?? '';
}
