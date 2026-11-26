/** WCAG 2.x contrast math, used by `contrast.test.ts` to guard the color tokens. */

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

/** Parses `#RRGGBB` into 0–255 channels. */
export function parseHexColor(hex: string): [number, number, number] {
  const digits = HEX_COLOR.exec(hex)?.[1];
  if (!digits) {
    throw new Error(`Expected a #RRGGBB color, received "${hex}"`);
  }
  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
}

/** Relative luminance of a color, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHexColor(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

/** Contrast ratio between two colors, from 1 to 21. AA needs 4.5 for text, 3 for control borders. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
