import { useTranslation } from 'react-i18next';

import { errorMessageKey } from '@fnb/api-client';
import { errorCodeSchema } from '@fnb/contract';

import type { FieldError } from 'react-hook-form';

/** Zod issue codes that have a shared message in `common:validation`. */
const VALIDATION_CODES = [
  'too_small',
  'too_big',
  'invalid_format',
  'invalid_type',
  'invalid_value',
  'custom',
] as const;

type ValidationCode = (typeof VALIDATION_CODES)[number];

function isValidationCode(value: string): value is ValidationCode {
  return (VALIDATION_CODES as readonly string[]).includes(value);
}

/**
 * Message of a form field error. Zod messages are English sentences meant for developers, so the
 * screen shows a translated message instead: a screen-specific one from `custom` (keyed by the
 * message the form schema sets), otherwise the shared message of the issue code.
 */
export function useFieldErrorMessage() {
  const { t } = useTranslation('common');
  return (
    error: FieldError | undefined,
    custom: Readonly<Record<string, string>> = {},
  ): string | undefined => {
    if (!error) {
      return undefined;
    }
    const specific = error.message ? custom[error.message] : undefined;
    if (specific) {
      return specific;
    }
    const code = typeof error.type === 'string' ? error.type : '';
    return t(`validation.${isValidationCode(code) ? code : 'invalid_value'}`);
  };
}

/** Translated message of an API error (plans/40-i18n-copy.md section 5); never the server's text. */
export function useApiErrorMessage() {
  const { t } = useTranslation('errors');
  return (error: unknown): string => {
    const { key, params } = errorMessageKey(error);
    const code = errorCodeSchema.safeParse(key.slice('errors:'.length));
    if (code.success) {
      return t(code.data, params);
    }
    return key === 'errors:network' ? t('network', params) : t('generic', params);
  };
}
