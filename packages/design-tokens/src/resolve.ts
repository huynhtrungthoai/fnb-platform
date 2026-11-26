import tokens from '../tokens.json' with { type: 'json' };

/** Themes generated so far. `customer`, `kds` and `mobile` are added with their apps. */
export const THEME_NAMES = ['admin', 'pos'] as const;

/** Name of a theme; each app applies exactly one. */
export type ThemeName = (typeof THEME_NAMES)[number];

/** The two color modes every theme supports. */
export const THEME_MODES = ['light', 'dark'] as const;

/** A concrete color mode. */
export type ThemeMode = (typeof THEME_MODES)[number];

/** What the user can pick in `ThemeSwitcher`: follow the system, or force a mode (D-31). */
export const THEME_MODE_PREFERENCES = ['system', 'light', 'dark'] as const;

/** The user's choice of color mode. */
export type ThemeModePreference = (typeof THEME_MODE_PREFERENCES)[number];

/** Name of a role color, for example `primary-fg` or `bg-subtle`. */
export type ColorToken = keyof typeof tokens.semantic.color;

/** Name of a shadow level. */
export type ShadowToken = keyof typeof tokens.semantic.shadow;

/** Metrics a theme chooses from the shared scale (plans/03-design-system.md section 5.2). */
export interface ThemeMetrics {
  /** Default control height in px. */
  control: number;
  /** Corner radius of controls in px. */
  controlRadius: number;
  /** Font size of text inside controls in px. */
  controlText: number;
  /** Base font size of the app in px. */
  bodyText: number;
}

/** A theme in one mode with every reference replaced by its value; the native theme object. */
export interface ResolvedTheme {
  name: ThemeName;
  mode: ThemeMode;
  colors: Record<ColorToken, string>;
  overlay: string;
  shadows: Record<ShadowToken, string>;
  chart: string[];
  metrics: ThemeMetrics;
}

const REFERENCE = /^\{([^}]+)\}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a dotted path such as `palette.red.600` from the token file. */
function lookup(path: string): unknown {
  let current: unknown = tokens;
  for (const key of path.split('.')) {
    if (!isRecord(current) || !(key in current)) {
      throw new Error(`Unknown token reference {${path}}`);
    }
    current = current[key];
  }
  return current;
}

/**
 * Follows `{layer.group.name}` references until a literal value is reached.
 * Throws on a missing or circular reference so a typo fails the build, not the UI.
 */
export function resolveReference(value: unknown, seen: readonly string[] = []): string | number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    throw new Error(`Token value must be a string or number, received ${typeof value}`);
  }
  const match = REFERENCE.exec(value);
  const path = match?.[1];
  if (!path) {
    return value;
  }
  if (seen.includes(path)) {
    throw new Error(`Circular token reference: ${[...seen, path].join(' -> ')}`);
  }
  return resolveReference(lookup(path), [...seen, path]);
}

function resolveString(value: unknown): string {
  return String(resolveReference(value));
}

function resolveNumber(value: unknown, label: string): number {
  const resolved = resolveReference(value);
  if (typeof resolved !== 'number') {
    throw new Error(`Token ${label} must resolve to a number, received "${resolved}"`);
  }
  return resolved;
}

function modeValue(pair: unknown, mode: ThemeMode, label: string): unknown {
  if (!isRecord(pair) || !(mode in pair)) {
    throw new Error(`Token ${label} has no ${mode} value`);
  }
  return pair[mode];
}

/** Color mode an app starts in before the user chooses (plans/03-design-system.md section 5.3). */
export function getDefaultModePreference(name: ThemeName): ThemeModePreference {
  const value: string = tokens.theme[name].defaultMode;
  return THEME_MODE_PREFERENCES.find((preference) => preference === value) ?? 'system';
}

/** Color overrides a theme declares for one mode, as `token -> value`. */
export function getThemeColorOverrides(name: ThemeName, mode: ThemeMode): Record<string, string> {
  const overrides: unknown = tokens.theme[name].color[mode];
  const result: Record<string, string> = {};
  if (isRecord(overrides)) {
    for (const [token, value] of Object.entries(overrides)) {
      if (!(token in tokens.semantic.color)) {
        throw new Error(`Theme ${name} overrides unknown color "${token}"`);
      }
      result[token] = resolveString(value);
    }
  }
  return result;
}

/** Resolves one theme in one mode to plain values. */
export function resolveTheme(name: ThemeName, mode: ThemeMode): ResolvedTheme {
  const overrides = getThemeColorOverrides(name, mode);
  const colorNames = Object.keys(tokens.semantic.color) as ColorToken[];
  const shadowNames = Object.keys(tokens.semantic.shadow) as ShadowToken[];
  const metric = tokens.theme[name].metric;

  const colors = Object.fromEntries(
    colorNames.map((token) => [
      token,
      overrides[token] ?? resolveString(modeValue(tokens.semantic.color[token], mode, token)),
    ]),
  ) as Record<ColorToken, string>;

  const shadows = Object.fromEntries(
    shadowNames.map((token) => [
      token,
      resolveString(modeValue(tokens.semantic.shadow[token], mode, `shadow.${token}`)),
    ]),
  ) as Record<ShadowToken, string>;

  return {
    name,
    mode,
    colors,
    overlay: resolveString(modeValue(tokens.semantic.overlay, mode, 'overlay')),
    shadows,
    chart: tokens.semantic.chart.map((value) => resolveString(value)),
    metrics: {
      control: resolveNumber(metric.control, `${name}.control`),
      controlRadius: resolveNumber(metric['control-radius'], `${name}.control-radius`),
      controlText: resolveNumber(metric['control-text'], `${name}.control-text`),
      bodyText: resolveNumber(metric['body-text'], `${name}.body-text`),
    },
  };
}

/** Every theme in both modes, resolved. Native apps read this; web apps use `theme.css`. */
export const themes: Record<ThemeName, Record<ThemeMode, ResolvedTheme>> = {
  admin: { light: resolveTheme('admin', 'light'), dark: resolveTheme('admin', 'dark') },
  pos: { light: resolveTheme('pos', 'light'), dark: resolveTheme('pos', 'dark') },
};

/** Shared metrics that do not change with the theme (plans/03-design-system.md sections 3, 4). */
export const metrics = {
  font: tokens.semantic.font,
  text: tokens.semantic.text,
  leading: tokens.semantic.leading,
  spaceUnit: tokens.semantic['space-unit'],
  radius: tokens.semantic.radius,
  duration: tokens.semantic.duration,
  touch: tokens.semantic.touch,
  control: tokens.semantic.control,
  icon: tokens.semantic.icon,
  size: tokens.semantic.size,
  z: tokens.semantic.z,
  breakpoint: tokens.semantic.breakpoint,
} as const;

/** The raw token file, for tools and the sample page that shows the palette. */
export { tokens };
