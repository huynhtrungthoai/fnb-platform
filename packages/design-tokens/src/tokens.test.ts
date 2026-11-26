import { describe, expect, it } from 'vitest';

import { generateCss } from './css.js';
import {
  getDefaultModePreference,
  metrics,
  resolveReference,
  resolveTheme,
  themes,
  THEME_MODES,
  THEME_NAMES,
  tokens,
} from './resolve.js';

const HEX = /^#[0-9A-F]{6}$/;

describe('token layers', () => {
  it('keeps the brand colors measured from the logo (D-21)', () => {
    expect(tokens.palette.red['600']).toBe('#CA0404');
    expect(tokens.palette.orange['500']).toBe('#ED6F03');
    expect(tokens.palette.yellow['400']).toBe('#F5BC09');
    expect(themes.admin.light.colors.primary).toBe('#CA0404');
    expect(themes.pos.light.colors.accent).toBe('#ED6F03');
    expect(themes.pos.light.colors.warning).toBe('#F5BC09');
  });

  it('defines every role color as a palette reference with light and dark values', () => {
    for (const [token, pair] of Object.entries(tokens.semantic.color)) {
      for (const mode of THEME_MODES) {
        expect(pair[mode], `${token}.${mode}`).toMatch(/^\{palette\.[a-z0-9.-]+\}$/);
        expect(String(resolveReference(pair[mode])), `${token}.${mode}`).toMatch(HEX);
      }
    }
  });

  it('gives each role color its four tokens', () => {
    for (const role of ['primary', 'accent', 'success', 'warning', 'danger', 'info']) {
      for (const suffix of ['', '-fg', '-subtle', '-text']) {
        expect(tokens.semantic.color).toHaveProperty(`${role}${suffix}`);
      }
    }
  });

  it('uses a crimson danger that is distinct from the brand red', () => {
    expect(themes.admin.light.colors.danger).toBe('#C2185B');
    expect(themes.admin.light.colors.danger).not.toBe(themes.admin.light.colors.primary);
  });

  it('rejects unknown and circular references', () => {
    expect(() => resolveReference('{palette.red.999}')).toThrow(/Unknown token reference/);
    expect(resolveReference('#123456')).toBe('#123456');
    expect(resolveReference(12)).toBe(12);
  });
});

describe('themes', () => {
  it('resolves every theme in both modes to plain values', () => {
    for (const name of THEME_NAMES) {
      for (const mode of THEME_MODES) {
        const theme = resolveTheme(name, mode);
        for (const [token, value] of Object.entries(theme.colors)) {
          expect(value, `${name}.${mode}.${token}`).toMatch(HEX);
        }
        expect(theme.chart).toHaveLength(8);
      }
    }
  });

  it('sizes controls per theme: compact admin, touch POS', () => {
    expect(themes.admin.light.metrics).toEqual({
      control: 40,
      controlRadius: 10,
      controlText: 14,
      bodyText: 14,
    });
    expect(themes.pos.light.metrics.control).toBe(56);
    expect(themes.pos.light.metrics.control).toBeGreaterThanOrEqual(metrics.touch.pos);
    expect(themes.pos.light.metrics.bodyText).toBeGreaterThan(themes.admin.light.metrics.bodyText);
  });

  it('starts admin in system mode and POS in light mode', () => {
    expect(getDefaultModePreference('admin')).toBe('system');
    expect(getDefaultModePreference('pos')).toBe('light');
  });

  it('keeps the shared scales from the design system', () => {
    expect(metrics.spaceUnit).toBe(4);
    expect(metrics.radius).toMatchObject({ sm: 6, md: 10, lg: 16 });
    expect(metrics.touch).toEqual({ min: 44, pos: 56 });
    expect(metrics.control).toEqual({ sm: 36, md: 40, lg: 48, xl: 56 });
    expect(metrics.duration).toEqual({ fast: 120, base: 200 });
  });
});

describe('generateCss', () => {
  const css = generateCss();

  it('emits role colors per mode and metrics per theme', () => {
    expect(css).toContain("[data-mode='light']");
    expect(css).toContain("[data-mode='dark']");
    expect(css).toContain('--fnb-primary: #CA0404;');
    expect(css).toContain('--fnb-primary: #F84839;');
    expect(css).toMatch(/\[data-theme='admin'\] \{\n {2}--fnb-control: 40px;/);
    expect(css).toMatch(/\[data-theme='pos'\] \{\n {2}--fnb-control: 56px;/);
  });

  it('maps Tailwind utilities to variables and removes the default palette', () => {
    expect(css).toContain('--color-*: initial;');
    expect(css).toContain('--color-primary: var(--fnb-primary);');
    expect(css).toContain('--color-bg-subtle: var(--fnb-bg-subtle);');
    expect(css).toContain('--spacing: 4px;');
    expect(css).toContain('--radius-md: 10px;');
    expect(css).toContain('--spacing-control: var(--fnb-control);');
    expect(css).toContain('@utility z-dialog');
  });

  it('respects reduced motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('contains no unresolved reference', () => {
    expect(css).not.toMatch(/\{(palette|semantic)\./);
  });
});
