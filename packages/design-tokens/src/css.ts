import {
  getThemeColorOverrides,
  metrics,
  resolveTheme,
  THEME_MODES,
  THEME_NAMES,
} from './resolve.js';

import type { ColorToken, ShadowToken, ThemeMode } from './resolve.js';

/**
 * Generates the stylesheet used by `@fnb/ui-web` and `@fnb/ui-pos`:
 *   1. CSS variables (`--fnb-*`) per `data-mode` and per `data-theme` on the root element
 *   2. a Tailwind 4 theme that maps utilities to those variables and removes Tailwind's own
 *      palette, so `bg-red-500` does not exist and `bg-primary` follows theme and mode
 *
 * Import it after Tailwind: `@import 'tailwindcss'; @import '@fnb/design-tokens/theme.css';`
 */

const px = (value: number): string => `${value}px`;
const rem = (value: number): string => `${value / 16}rem`;
const ms = (value: number): string => `${value}ms`;

function block(selector: string, declarations: readonly string[]): string {
  if (declarations.length === 0) {
    return '';
  }
  return `${selector} {\n${declarations.map((line) => `  ${line}`).join('\n')}\n}\n`;
}

function entries<T extends Record<string, unknown>>(record: T): [keyof T & string, T[keyof T]][] {
  return Object.entries(record) as [keyof T & string, T[keyof T]][];
}

function modeDeclarations(mode: ThemeMode): string[] {
  // Any theme works here: role colors are shared and theme overrides are emitted separately.
  const base = resolveTheme('admin', mode);
  const overridden = getThemeColorOverrides('admin', mode);
  const colorNames = Object.keys(base.colors) as ColorToken[];
  const shadowNames = Object.keys(base.shadows) as ShadowToken[];

  return [
    `color-scheme: ${mode};`,
    ...colorNames
      .filter((token) => !(token in overridden))
      .map((token) => `--fnb-${token}: ${base.colors[token]};`),
    `--fnb-overlay: ${base.overlay};`,
    ...shadowNames.map((token) => `--fnb-shadow-${token}: ${base.shadows[token]};`),
    ...base.chart.map((value, index) => `--fnb-chart-${index + 1}: ${value};`),
  ];
}

function sharedDeclarations(): string[] {
  return [
    ...entries(metrics.font).map(([name, value]) => `--fnb-font-${name}: ${value};`),
    ...entries(metrics.leading).map(([name, value]) => `--fnb-leading-${name}: ${value};`),
    ...entries(metrics.duration).map(([name, value]) => `--fnb-duration-${name}: ${ms(value)};`),
    ...entries(metrics.touch).map(([name, value]) => `--fnb-touch-${name}: ${px(value)};`),
    ...entries(metrics.icon).map(([name, value]) => `--fnb-icon-${name}: ${px(value)};`),
    ...entries(metrics.size).map(([name, value]) => `--fnb-size-${name}: ${px(value)};`),
    ...entries(metrics.z).map(([name, value]) => `--fnb-z-${name}: ${value};`),
  ];
}

function themeBlocks(): string {
  let css = '';
  for (const name of THEME_NAMES) {
    const theme = resolveTheme(name, 'light');
    css += block(`[data-theme='${name}']`, [
      `--fnb-control: ${px(theme.metrics.control)};`,
      `--fnb-control-radius: ${px(theme.metrics.controlRadius)};`,
      `--fnb-control-text: ${rem(theme.metrics.controlText)};`,
      `--fnb-body-text: ${rem(theme.metrics.bodyText)};`,
    ]);
    for (const mode of THEME_MODES) {
      css += block(
        `[data-theme='${name}'][data-mode='${mode}']`,
        Object.entries(getThemeColorOverrides(name, mode)).map(
          ([token, value]) => `--fnb-${token}: ${value};`,
        ),
      );
    }
  }
  return css;
}

function tailwindTheme(): string {
  const light = resolveTheme('admin', 'light');
  const colorNames = Object.keys(light.colors) as ColorToken[];
  const shadowNames = Object.keys(light.shadows) as ShadowToken[];

  const staticTheme = block('@theme', [
    // Remove Tailwind's defaults so only tokens can be used.
    '--color-*: initial;',
    '--font-*: initial;',
    '--text-*: initial;',
    '--radius-*: initial;',
    '--shadow-*: initial;',
    '--breakpoint-*: initial;',
    '--container-*: initial;',
    `--spacing: ${px(metrics.spaceUnit)};`,
    ...entries(metrics.text).flatMap(([name, value]) => [
      `--text-${name}: ${rem(value)};`,
      `--text-${name}--line-height: ${metrics.leading.normal};`,
    ]),
    ...entries(metrics.radius).map(([name, value]) => `--radius-${name}: ${px(value)};`),
    ...entries(metrics.breakpoint).map(([name, value]) => `--breakpoint-${name}: ${px(value)};`),
    ...entries(metrics.control).map(([name, value]) => `--spacing-control-${name}: ${px(value)};`),
    ...entries(metrics.touch).map(([name, value]) => `--spacing-touch-${name}: ${px(value)};`),
    ...entries(metrics.icon).map(([name, value]) => `--spacing-icon-${name}: ${px(value)};`),
    ...entries(metrics.size).map(([name, value]) => `--container-${name}: ${px(value)};`),
    ...entries(metrics.size).map(([name, value]) => `--spacing-${name}: ${px(value)};`),
  ]);

  const inlineTheme = block('@theme inline', [
    '--color-transparent: transparent;',
    '--color-current: currentColor;',
    ...colorNames.map((token) => `--color-${token}: var(--fnb-${token});`),
    '--color-overlay: var(--fnb-overlay);',
    ...light.chart.map((_, index) => `--color-chart-${index + 1}: var(--fnb-chart-${index + 1});`),
    ...shadowNames.map((token) => `--shadow-${token}: var(--fnb-shadow-${token});`),
    ...entries(metrics.font).map(([name]) => `--font-${name}: var(--fnb-font-${name});`),
    // Theme-dependent metrics: the same class gives 40 px in admin and 56 px in POS.
    '--spacing-control: var(--fnb-control);',
    '--radius-control: var(--fnb-control-radius);',
    '--text-control: var(--fnb-control-text);',
    `--text-control--line-height: ${metrics.leading.normal};`,
    '--text-body: var(--fnb-body-text);',
    `--text-body--line-height: ${metrics.leading.normal};`,
  ]);

  const utilities = [
    ...entries(metrics.z).map(([name]) =>
      block(`@utility z-${name}`, [`z-index: var(--fnb-z-${name});`]),
    ),
    ...entries(metrics.duration).map(([name]) =>
      block(`@utility duration-${name}`, [`transition-duration: var(--fnb-duration-${name});`]),
    ),
  ].join('');

  return staticTheme + inlineTheme + utilities;
}

/** Returns the full generated stylesheet. */
export function generateCss(): string {
  return [
    '/* Generated from tokens.json by @fnb/design-tokens. Do not edit; change tokens.json. */\n',
    block(':root', sharedDeclarations()),
    // Light is also the fallback before the app sets data-mode.
    block(":root,\n[data-mode='light']", modeDeclarations('light')),
    block("[data-mode='dark']", modeDeclarations('dark')),
    themeBlocks(),
    tailwindTheme(),
    // Honour the operating system's "reduce motion" setting everywhere.
    '@media (prefers-reduced-motion: reduce) {\n' +
      '  *,\n  ::before,\n  ::after {\n' +
      '    animation-duration: 0.01ms !important;\n' +
      '    animation-iteration-count: 1 !important;\n' +
      '    transition-duration: 0.01ms !important;\n' +
      '  }\n}\n',
  ].join('\n');
}
