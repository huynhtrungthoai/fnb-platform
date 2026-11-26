import { useTranslation } from 'react-i18next';

import { THEME_MODE_PREFERENCES } from '@fnb/design-tokens';

import { SegmentedControl } from './segmented-control';

import type { IconName } from './icon';
import type { ThemeModePreference } from '@fnb/design-tokens';

export interface ThemeSwitcherProps {
  value: ThemeModePreference;
  onChange: (preference: ThemeModePreference) => void;
  className?: string;
}

const ICONS: Record<ThemeModePreference, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};

/** Lets the user pick System / Light / Dark (D-31). Pair it with `useThemeMode`. */
export function ThemeSwitcher({ value, onChange, className }: ThemeSwitcherProps) {
  const { t } = useTranslation('common');
  return (
    <SegmentedControl
      label={t('theme.label')}
      value={value}
      onChange={onChange}
      className={className}
      options={THEME_MODE_PREFERENCES.map((preference) => ({
        value: preference,
        label: t(`theme.${preference}`),
        icon: ICONS[preference],
      }))}
    />
  );
}
