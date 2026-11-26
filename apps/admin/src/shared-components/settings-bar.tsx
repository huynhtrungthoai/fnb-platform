import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@fnb/i18n';
import { LanguageSwitcher, ThemeSwitcher, useThemeMode } from '@fnb/ui-web';

import type { Locale } from '@fnb/contract';

export interface SettingsBarProps {
  /** Called with the picked language; the app changes and stores it. */
  onLocaleChange: (locale: Locale) => void;
}

/** Language and appearance switchers side by side, wired to the app's current settings. */
export function SettingsBar({ onLocaleChange }: SettingsBarProps) {
  const { i18n } = useTranslation();
  const { preference, setPreference } = useThemeMode();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <LanguageSwitcher value={resolveLocale(i18n.language)} onChange={onLocaleChange} />
      <ThemeSwitcher value={preference} onChange={setPreference} />
    </div>
  );
}
