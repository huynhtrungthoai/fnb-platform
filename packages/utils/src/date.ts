/**
 * Date helpers. Instants are stored in UTC; reports group by the branch's business day
 * (plans/04-architecture.md). Apps never add or subtract time zone offsets by hand.
 * Display formatting lives in `@fnb/i18n` (`formatDate`, `formatTime`).
 */

/** Time zone used when a branch has none configured. */
export const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Business day cutoff used when a branch has none configured (D-36). */
export const DEFAULT_DAY_CUTOFF = '00:00';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CUTOFF_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Wall-clock fields of an instant in a given time zone. */
export interface ZonedDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Returns the wall-clock fields of an instant in a time zone. */
export function toZonedDateTime(
  instant: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): ZonedDateTime {
  const fields: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') {
      fields[part.type] = Number(part.value);
    }
  }
  return {
    year: fields.year ?? 0,
    month: fields.month ?? 1,
    day: fields.day ?? 1,
    hour: fields.hour ?? 0,
    minute: fields.minute ?? 0,
    second: fields.second ?? 0,
  };
}

/** Parses a cutoff written as `HH:mm` into minutes after midnight. */
export function parseDayCutoff(cutoff: string): number {
  const match = CUTOFF_PATTERN.exec(cutoff);
  if (!match) {
    throw new RangeError(`cutoff must be HH:mm, received ${cutoff}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Converts a wall-clock time in a time zone to the UTC instant.
 * The offset is looked up twice so the result is right on both sides of a DST change.
 */
export function zonedTimeToUtc(
  local: Pick<ZonedDateTime, 'year' | 'month' | 'day'> & Partial<ZonedDateTime>,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date {
  const wallClock = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour ?? 0,
    local.minute ?? 0,
    local.second ?? 0,
  );
  const offsetAt = (instant: number): number => {
    const zoned = toZonedDateTime(new Date(instant), timeZone);
    const asUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    return asUtc - Math.floor(instant / 1000) * 1000;
  };
  const firstGuess = wallClock - offsetAt(wallClock);
  return new Date(wallClock - offsetAt(firstGuess));
}

/**
 * Business day (`YYYY-MM-DD`) an instant belongs to, in the branch's time zone.
 * With a cutoff of 04:00, a sale at 02:30 still counts for the previous day.
 */
export function getBusinessDate(
  instant: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  cutoff: string = DEFAULT_DAY_CUTOFF,
): string {
  const cutoffMinutes = parseDayCutoff(cutoff);
  const zoned = toZonedDateTime(instant, timeZone);
  // Do the day arithmetic on a UTC date built from the wall-clock fields, so no offset is involved.
  const shifted = new Date(
    Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute) -
      cutoffMinutes * MINUTE_MS,
  );
  return toIsoDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** UTC range `[start, end)` covered by a business day of a branch. */
export function getBusinessDayRange(
  businessDate: string,
  timeZone: string = DEFAULT_TIME_ZONE,
  cutoff: string = DEFAULT_DAY_CUTOFF,
): { start: Date; end: Date } {
  const match = ISO_DATE_PATTERN.exec(businessDate);
  if (!match) {
    throw new RangeError(`businessDate must be YYYY-MM-DD, received ${businessDate}`);
  }
  const cutoffMinutes = parseDayCutoff(cutoff);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Math.floor(cutoffMinutes / 60);
  const minute = cutoffMinutes % 60;

  const nextDay = new Date(Date.UTC(year, month - 1, day) + DAY_MS);
  return {
    start: zonedTimeToUtc({ year, month, day, hour, minute }, timeZone),
    end: zonedTimeToUtc(
      {
        year: nextDay.getUTCFullYear(),
        month: nextDay.getUTCMonth() + 1,
        day: nextDay.getUTCDate(),
        hour,
        minute,
      },
      timeZone,
    ),
  };
}
