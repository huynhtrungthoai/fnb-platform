import { useTranslation } from 'react-i18next';

import { Input } from './input';

import type { LocalizedText } from '@fnb/contract';

export interface LocalizedInputProps {
  /** Label of the field; the language is added after it. */
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  /** Error of the Vietnamese name, which is required. */
  error?: string;
  disabled?: boolean;
}

/** A display name in both languages (40 section 4): Vietnamese required, English warned when missing. */
export function LocalizedInput({ label, value, onChange, error, disabled }: LocalizedInputProps) {
  const { t } = useTranslation('common');
  const english = value.en ?? '';
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        label={`${label} (${t('language.short.vi')})`}
        value={value.vi}
        onChange={(vi) => {
          onChange({ ...value, vi });
        }}
        {...(error ? { error } : {})}
        {...(disabled === undefined ? {} : { disabled })}
      />
      <Input
        label={`${label} (${t('language.short.en')})`}
        value={english}
        onChange={(en) => {
          onChange(en.trim() === '' ? { vi: value.vi } : { ...value, en });
        }}
        {...(english.trim() === '' && value.vi.trim() !== ''
          ? { hint: t('localized.missingEnglish') }
          : {})}
        {...(disabled === undefined ? {} : { disabled })}
      />
    </div>
  );
}
