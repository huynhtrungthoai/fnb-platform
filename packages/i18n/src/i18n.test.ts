import { describe, expect, it } from 'vitest';

import {
  createI18n,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatTime,
  localize,
  resolveLocale,
  resources,
} from './index.js';

/** Intl separates the amount and the currency sign with a no-break space. */
const normalizeSpaces = (value: string): string => value.replace(/[\u00a0\u202f]/g, ' ');

describe('createI18n', () => {
  it('starts in Vietnamese by default and is ready synchronously', () => {
    const i18n = createI18n();
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('vi');
    expect(i18n.t('actions.retry')).toBe('Thử lại');
    expect(i18n.t('common:theme.system')).toBe('Theo hệ thống');
  });

  it('starts in the requested language and switches at runtime', async () => {
    const i18n = createI18n({ locale: 'en' });
    expect(i18n.t('actions.retry')).toBe('Try again');
    await i18n.changeLanguage('vi');
    expect(i18n.t('actions.retry')).toBe('Thử lại');
  });

  it('falls back to Vietnamese for an unsupported or missing language', () => {
    expect(createI18n({ locale: 'fr' }).language).toBe('vi');
    expect(createI18n({ locale: null }).language).toBe('vi');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale(undefined)).toBe('vi');
  });

  it('keeps instances independent', async () => {
    const first = createI18n({ locale: 'vi' });
    const second = createI18n({ locale: 'vi' });
    await first.changeLanguage('en');
    expect(second.language).toBe('vi');
  });
});

describe('resources', () => {
  it('bundles the same namespaces for both languages', () => {
    expect(Object.keys(resources.en)).toEqual(Object.keys(resources.vi));
  });
});

describe('formatMoney', () => {
  it('formats VND per language', () => {
    expect(normalizeSpaces(formatMoney(120_000, 'vi'))).toBe('120.000 ₫');
    expect(formatMoney(120_000, 'en')).toBe('₫120,000');
    expect(normalizeSpaces(formatMoney(0, 'vi'))).toBe('0 ₫');
    expect(normalizeSpaces(formatMoney(-45_000, 'vi'))).toBe('-45.000 ₫');
  });

  it('refuses a non-integer amount instead of rounding silently', () => {
    expect(() => formatMoney(1.5, 'vi')).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, 'en')).toThrow(RangeError);
  });
});

describe('formatNumber', () => {
  it('uses the separators of each language', () => {
    expect(formatNumber(1234.5, 'vi')).toBe('1.234,5');
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
  });
});

describe('formatDate / formatTime', () => {
  const instant = '2026-11-26T07:30:00Z'; // 14:30 in Vietnam

  it('formats the date per language in the branch time zone', () => {
    expect(formatDate(instant, 'vi')).toBe('26/11/2026');
    expect(formatDate(instant, 'en')).toBe('26 Nov 2026');
    // 18:30 UTC is already the next day in Vietnam.
    expect(formatDate('2026-11-26T18:30:00Z', 'vi')).toBe('27/11/2026');
  });

  it('uses the 24-hour clock in both languages', () => {
    expect(formatTime(instant, 'vi')).toBe('14:30');
    expect(formatTime(instant, 'en')).toBe('14:30');
    expect(formatTime('2026-11-26T17:05:00Z', 'en')).toBe('00:05');
  });

  it('formats time and date together and honours another time zone', () => {
    expect(formatDateTime(instant, 'vi')).toBe('14:30 26/11/2026');
    expect(formatDateTime(instant, 'en', 'UTC')).toBe('07:30 26 Nov 2026');
  });

  it('rejects an invalid date', () => {
    expect(() => formatDate('not a date', 'vi')).toThrow(RangeError);
  });
});

describe('localize', () => {
  const name = { vi: 'Hotdog phô mai', en: 'Cheese hotdog' };

  it('returns the value of the current language', () => {
    expect(localize(name, 'vi')).toBe('Hotdog phô mai');
    expect(localize(name, 'en')).toBe('Cheese hotdog');
  });

  it('falls back to Vietnamese when English is missing or blank', () => {
    expect(localize({ vi: 'Trà đá' }, 'en')).toBe('Trà đá');
    expect(localize({ vi: 'Trà đá', en: '' }, 'en')).toBe('Trà đá');
    expect(localize({ vi: 'Trà đá', en: '   ' }, 'en')).toBe('Trà đá');
  });

  it('returns an empty string for a missing value', () => {
    expect(localize(undefined, 'vi')).toBe('');
    expect(localize(null, 'en')).toBe('');
  });
});
