import { describe, expect, it } from 'vitest';

import {
  getBusinessDate,
  getBusinessDayRange,
  parseDayCutoff,
  toZonedDateTime,
  zonedTimeToUtc,
} from './date.js';

describe('toZonedDateTime', () => {
  it('converts a UTC instant to Vietnam wall-clock time (UTC+7)', () => {
    expect(toZonedDateTime(new Date('2026-11-26T18:30:15Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 27,
      hour: 1,
      minute: 30,
      second: 15,
    });
  });
});

describe('parseDayCutoff', () => {
  it('parses HH:mm', () => {
    expect(parseDayCutoff('00:00')).toBe(0);
    expect(parseDayCutoff('04:30')).toBe(270);
  });

  it('rejects malformed values', () => {
    expect(() => parseDayCutoff('24:00')).toThrow(RangeError);
    expect(() => parseDayCutoff('4am')).toThrow(RangeError);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts Vietnam wall-clock time to UTC', () => {
    expect(
      zonedTimeToUtc({ year: 2026, month: 11, day: 27, hour: 1, minute: 30 }).toISOString(),
    ).toBe('2026-11-26T18:30:00.000Z');
  });

  it('is correct on both sides of a DST change', () => {
    // New York leaves DST on 2026-11-01 at 02:00 local time.
    expect(
      zonedTimeToUtc(
        { year: 2026, month: 10, day: 31, hour: 12 },
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-31T16:00:00.000Z');
    expect(
      zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 12 }, 'America/New_York').toISOString(),
    ).toBe('2026-11-01T17:00:00.000Z');
  });
});

describe('getBusinessDate', () => {
  it('uses the branch time zone, not UTC', () => {
    // 18:30 UTC is already 01:30 the next day in Vietnam.
    expect(getBusinessDate(new Date('2026-11-26T18:30:00Z'))).toBe('2026-11-27');
    expect(getBusinessDate(new Date('2026-11-26T16:59:59Z'))).toBe('2026-11-26');
    expect(getBusinessDate(new Date('2026-11-26T17:00:00Z'))).toBe('2026-11-27');
  });

  it('keeps late-night sales on the previous business day when a cutoff is set', () => {
    const lateNight = new Date('2026-11-26T19:30:00Z'); // 02:30 on the 27th in Vietnam
    expect(getBusinessDate(lateNight, 'Asia/Ho_Chi_Minh', '04:00')).toBe('2026-11-26');
    expect(getBusinessDate(new Date('2026-11-26T21:00:00Z'), 'Asia/Ho_Chi_Minh', '04:00')).toBe(
      '2026-11-27',
    );
  });

  it('crosses month and year boundaries', () => {
    expect(getBusinessDate(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01');
    expect(getBusinessDate(new Date('2026-12-31T18:00:00Z'), 'Asia/Ho_Chi_Minh', '04:00')).toBe(
      '2026-12-31',
    );
  });
});

describe('getBusinessDayRange', () => {
  it('returns the UTC range of a Vietnam business day', () => {
    const range = getBusinessDayRange('2026-11-27');
    expect(range.start.toISOString()).toBe('2026-11-26T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-27T17:00:00.000Z');
  });

  it('applies the cutoff to both ends', () => {
    const range = getBusinessDayRange('2026-11-27', 'Asia/Ho_Chi_Minh', '04:00');
    expect(range.start.toISOString()).toBe('2026-11-26T21:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-27T21:00:00.000Z');
  });

  it('agrees with getBusinessDate at the edges', () => {
    const range = getBusinessDayRange('2026-11-27', 'Asia/Ho_Chi_Minh', '04:00');
    expect(getBusinessDate(range.start, 'Asia/Ho_Chi_Minh', '04:00')).toBe('2026-11-27');
    expect(getBusinessDate(new Date(range.end.getTime() - 1), 'Asia/Ho_Chi_Minh', '04:00')).toBe(
      '2026-11-27',
    );
    expect(getBusinessDate(range.end, 'Asia/Ho_Chi_Minh', '04:00')).toBe('2026-11-28');
  });

  it('rejects a malformed date', () => {
    expect(() => getBusinessDayRange('27/11/2026')).toThrow(RangeError);
  });
});
