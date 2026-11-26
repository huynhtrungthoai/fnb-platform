import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  healthResponseSchema,
  localeSchema,
  localizedTextSchema,
} from './index.js';

describe('localeSchema', () => {
  it('accepts the two supported languages and rejects others', () => {
    expect(localeSchema.parse('vi')).toBe('vi');
    expect(localeSchema.parse('en')).toBe('en');
    expect(localeSchema.safeParse('fr').success).toBe(false);
    expect(DEFAULT_LOCALE).toBe('vi');
  });
});

describe('localizedTextSchema', () => {
  it('keeps both languages and trims them', () => {
    expect(localizedTextSchema.parse({ vi: '  Hotdog phô mai ', en: ' Cheese hotdog ' })).toEqual({
      vi: 'Hotdog phô mai',
      en: 'Cheese hotdog',
    });
  });

  it('drops an empty or blank English value', () => {
    expect(localizedTextSchema.parse({ vi: 'Trà đá', en: '' })).toEqual({ vi: 'Trà đá' });
    expect(localizedTextSchema.parse({ vi: 'Trà đá', en: '   ' })).toEqual({ vi: 'Trà đá' });
    expect(localizedTextSchema.parse({ vi: 'Trà đá' })).toEqual({ vi: 'Trà đá' });
  });

  it('requires a non-blank Vietnamese value', () => {
    expect(localizedTextSchema.safeParse({ vi: '   ', en: 'Iced tea' }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ en: 'Iced tea' }).success).toBe(false);
  });
});

describe('healthResponseSchema', () => {
  const body = {
    status: 'degraded',
    version: '0.0.0',
    uptimeSeconds: 12.5,
    timestamp: '2026-11-26T03:00:00.000Z',
    dependencies: { database: 'down', redis: 'up', storage: 'up' },
  };

  it('accepts a well-formed response', () => {
    expect(healthResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown status', () => {
    expect(healthResponseSchema.safeParse({ ...body, status: 'broken' }).success).toBe(false);
  });
});
