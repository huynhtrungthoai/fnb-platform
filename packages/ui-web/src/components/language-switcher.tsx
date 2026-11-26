import { useTranslation } from 'react-i18next';

import { LOCALES } from '@fnb/contract';

import { SegmentedControl } from './segmented-control';

import type { Locale } from '@fnb/contract';

export interface LanguageSwitcherProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
}

/** Lets the user pick Vietnamese or English. The app stores the choice. */
export function LanguageSwitcher({ value, onChange, className }: LanguageSwitcherProps) {
  const { t } = useTranslation('common');
  return (
    <SegmentedControl
      label={t('language.label')}
      value={value}
      onChange={onChange}
      className={className}
      // Each language is always written in its own name, whatever the current language is.
      options={LOCALES.map((locale) => ({ value: locale, label: t(`language.${locale}`) }))}
    />
  );
}
