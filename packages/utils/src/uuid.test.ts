import { describe, expect, it } from 'vitest';

import { isUuidV7, uuidv7, uuidV7ToDate } from './uuid.js';

describe('uuidv7', () => {
  it('produces a version 7, variant 10 UUID', () => {
    const id = uuidv7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(isUuidV7(id)).toBe(true);
  });

  it('stores the creation time in the first 48 bits', () => {
    const now = Date.UTC(2030, 0, 15, 8, 30, 0, 123);
    expect(uuidV7ToDate(uuidv7(now))?.getTime()).toBe(now);
  });

  it('is unique and sortable, even within the same millisecond', () => {
    const now = Date.UTC(2031, 5, 1);
    const ids = Array.from({ length: 5000 }, () => uuidv7(now));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('keeps ordering when the clock goes backwards', () => {
    const later = uuidv7(Date.UTC(2032, 0, 1, 0, 0, 1));
    const earlierClock = uuidv7(Date.UTC(2032, 0, 1, 0, 0, 0));
    expect(earlierClock > later).toBe(true);
  });

  it('sorts ids from later milliseconds after earlier ones', () => {
    const first = uuidv7(Date.UTC(2033, 0, 1, 0, 0, 0, 0));
    const second = uuidv7(Date.UTC(2033, 0, 1, 0, 0, 0, 1));
    expect(second > first).toBe(true);
  });
});

describe('isUuidV7 / uuidV7ToDate', () => {
  it('rejects other versions, malformed and missing values', () => {
    expect(isUuidV7('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isUuidV7('not-a-uuid')).toBe(false);
    expect(isUuidV7(undefined)).toBe(false);
    expect(uuidV7ToDate('550e8400-e29b-41d4-a716-446655440000')).toBeNull();
    expect(uuidV7ToDate(null)).toBeNull();
  });
});
