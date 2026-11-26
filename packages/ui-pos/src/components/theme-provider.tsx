import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getDefaultModePreference, THEME_MODE_PREFERENCES } from '@fnb/design-tokens';

import type { ThemeMode, ThemeModePreference, ThemeName } from '@fnb/design-tokens';
import type { ReactNode } from 'react';

interface ThemeContextValue {
  theme: ThemeName;
  /** What the user picked: follow the system, or a fixed mode. */
  preference: ThemeModePreference;
  /** The mode currently applied. */
  mode: ThemeMode;
  setPreference: (preference: ThemeModePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredPreference(storageKey: string): ThemeModePreference | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return THEME_MODE_PREFERENCES.find((preference) => preference === stored) ?? null;
  } catch {
    // Storage can be blocked (private mode, embedded WebView); fall back to the default.
    return null;
  }
}

function isSystemDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export interface ThemeProviderProps {
  /** The theme of the app. It never changes at runtime; only the mode does. */
  theme: ThemeName;
  /** localStorage key; the choice is kept per device, not per account (D-31). */
  storageKey?: string;
  children: ReactNode;
}

/**
 * Applies `data-theme` and `data-mode` to the root element, keeps the user's choice on the
 * device and follows the operating system while the choice is "system".
 */
export function ThemeProvider({ theme, storageKey, children }: ThemeProviderProps) {
  const key = storageKey ?? `fnb.${theme}.theme-mode`;
  const [preference, setPreferenceState] = useState<ThemeModePreference>(
    () => readStoredPreference(key) ?? getDefaultModePreference(theme),
  );
  const [systemDark, setSystemDark] = useState<boolean>(isSystemDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemDark(event.matches);
    };
    query.addEventListener('change', handleChange);
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  const mode: ThemeMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    // Switching mode only swaps attributes; no reload (plans/03-design-system.md section 5.3).
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  const setPreference = useCallback(
    (next: ThemeModePreference) => {
      setPreferenceState(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // The choice still applies for this session when storage is unavailable.
      }
    },
    [key],
  );

  const value = useMemo(
    () => ({ theme, preference, mode, setPreference }),
    [theme, preference, mode, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Reads and changes the color mode. Must be used under `ThemeProvider`. */
export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used inside ThemeProvider');
  }
  return context;
}
