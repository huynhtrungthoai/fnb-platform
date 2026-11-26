import { assertVndAmount, DEFAULT_TIME_ZONE } from '@fnb/utils';

import type { Locale } from '@fnb/contract';

/**
 * Display formatting (plans/40-i18n-copy.md section 8). Apps never build these strings by hand:
 * no appended "đ", no `toLocaleString`. Dates are shown in the branch's time zone.
 */

const NUMBER_LOCALES: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };
// British English gives the day-first "26 Nov 2026" the copy guide asks for.
const DATE_LOCALES: Record<Locale, string> = { vi: 'vi-VN', en: 'en-GB' };

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }
  return date;
}

/** Formats an integer VND amount: `120.000 ₫` in Vietnamese, `₫120,000` in English. */
export function formatMoney(amount: number, locale: Locale): string {
  assertVndAmount(amount);
  return new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a plain number: `1.234,5` in Vietnamese, `1,234.5` in English. */
export function formatNumber(
  value: number,
  locale: Locale,
  options: Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {},
): string {
  return new Intl.NumberFormat(NUMBER_LOCALES[locale], options).format(value);
}

/** Formats a calendar date: `26/11/2026` in Vietnamese, `26 Nov 2026` in English. */
export function formatDate(
  value: DateInput,
  locale: Locale,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const options: Intl.DateTimeFormatOptions =
    locale === 'vi'
      ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }
      : { day: '2-digit', month: 'short', year: 'numeric', timeZone };
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], options).format(toDate(value));
}

/** Formats a time of day on the 24-hour clock in both languages: `14:30`. */
export function formatTime(
  value: DateInput,
  locale: Locale,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(toDate(value));
}

/** Formats time then date, for example `14:30 26/11/2026`. */
export function formatDateTime(
  value: DateInput,
  locale: Locale,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return `${formatTime(value, locale, timeZone)} ${formatDate(value, locale, timeZone)}`;
}
