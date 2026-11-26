import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from './contrast.js';
import { resolveTheme, THEME_MODES, THEME_NAMES } from './resolve.js';

import type { ColorToken } from './resolve.js';

/** WCAG AA thresholds (plans/07-brand.md section 3). */
const TEXT_MINIMUM = 4.5;
const CONTROL_BORDER_MINIMUM = 3;

const ROLES = ['primary', 'accent', 'success', 'warning', 'danger', 'info'] as const;
const SURFACES = ['bg', 'bg-subtle', 'bg-muted'] as const satisfies readonly ColorToken[];
const TEXTS = ['text', 'text-muted', 'text-subtle'] as const satisfies readonly ColorToken[];

/** Every text/background pair the components are allowed to use, as [foreground, background]. */
const TEXT_PAIRS: [ColorToken, ColorToken][] = [
  // Body text on every neutral surface. `text-subtle` on `bg-muted` is a known gap, see below.
  ...TEXTS.flatMap((text) => SURFACES.map((surface): [ColorToken, ColorToken] => [text, surface])),
  // Text on a solid role color, and role-colored text on its tint.
  ...ROLES.flatMap((role): [ColorToken, ColorToken][] => [
    [`${role}-fg`, role],
    [`${role}-text`, `${role}-subtle`],
    // Role text is also used directly on the page, for example an inline error message.
    [`${role}-text`, 'bg'],
    [`${role}-text`, 'bg-subtle'],
  ]),
  // The primary button keeps its label readable while hovered and pressed.
  ['primary-fg', 'primary-hover'],
  ['primary-fg', 'primary-active'],
];

/** Borders and focus rings that mark the edge of a control. */
const BORDER_PAIRS: [ColorToken, ColorToken][] = [
  ['border-strong', 'bg'],
  ['ring', 'bg'],
  // DangerButton is outlined by default: its border is the danger color on the page.
  ['danger', 'bg'],
];

/**
 * Pairs that miss AA in light mode with the approved values of plans/07-brand.md section 3.1.
 * They are excluded from the checks above and pinned here, so they cannot get worse and the
 * exception must be deleted once the token is changed (open question in plan 07 section 10).
 */
const KNOWN_LIGHT_GAPS: { pair: [ColorToken, ColorToken]; minimum: number; floor: number }[] = [
  // Hint and placeholder text must not sit on bg-muted; use text-muted there.
  { pair: ['text-subtle', 'bg-muted'], minimum: TEXT_MINIMUM, floor: 4.4 },
  // An outlined control on a card is judged against its own fill (bg), which passes.
  { pair: ['border-strong', 'bg-subtle'], minimum: CONTROL_BORDER_MINIMUM, floor: 2.9 },
];

const isKnownGap = (mode: string, foreground: ColorToken, background: ColorToken): boolean =>
  mode === 'light' &&
  KNOWN_LIGHT_GAPS.some(({ pair }) => pair[0] === foreground && pair[1] === background);

describe('contrast math', () => {
  it('matches the WCAG reference values', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Measured in plans/07-brand.md section 1.3: white on the brand red.
    expect(contrastRatio('#FFFFFF', '#CA0404')).toBeCloseTo(5.95, 1);
  });
});

describe.each(THEME_NAMES)('theme %s', (name) => {
  describe.each(THEME_MODES)('%s mode', (mode) => {
    const { colors } = resolveTheme(name, mode);

    it.each(TEXT_PAIRS)('%s on %s meets AA for text', (foreground, background) => {
      if (isKnownGap(mode, foreground, background)) {
        return;
      }
      const ratio = contrastRatio(colors[foreground], colors[background]);
      expect(
        ratio,
        `${foreground} ${colors[foreground]} on ${background} ${colors[background]}`,
      ).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each(BORDER_PAIRS)('%s on %s meets AA for control borders', (foreground, background) => {
      const ratio = contrastRatio(colors[foreground], colors[background]);
      expect(
        ratio,
        `${foreground} ${colors[foreground]} on ${background} ${colors[background]}`,
      ).toBeGreaterThanOrEqual(CONTROL_BORDER_MINIMUM);
    });

    it('keeps the documented light-mode gaps from getting worse', () => {
      if (mode !== 'light') {
        return;
      }
      for (const { pair, minimum, floor } of KNOWN_LIGHT_GAPS) {
        const ratio = contrastRatio(colors[pair[0]], colors[pair[1]]);
        expect(ratio, `${pair[0]} on ${pair[1]}`).toBeGreaterThanOrEqual(floor);
        // If this fails the token was fixed: remove the pair from KNOWN_LIGHT_GAPS.
        expect(ratio, `${pair[0]} on ${pair[1]} now passes AA`).toBeLessThan(minimum);
      }
    });

    it('never uses the warning yellow as text or border on a light surface', () => {
      // Documented limit (plans/07-brand.md section 3): warning is a background only.
      if (mode === 'light') {
        expect(contrastRatio(colors.warning, colors.bg)).toBeLessThan(CONTROL_BORDER_MINIMUM);
      }
      expect(contrastRatio(colors['warning-fg'], colors.warning)).toBeGreaterThanOrEqual(
        TEXT_MINIMUM,
      );
    });
  });
});
