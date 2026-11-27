import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps paths inside the app', () => {
    expect(safeRedirect('/branches?tab=info')).toBe('/branches?tab=info');
  });

  it('refuses other sites, missing values and the sign-in screens', () => {
    expect(safeRedirect('https://evil.test')).toBe('/');
    expect(safeRedirect('//evil.test')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect('/login?redirect=/x')).toBe('/');
    expect(safeRedirect('/change-pin')).toBe('/');
  });
});
