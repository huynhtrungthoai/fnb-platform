import { render } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { createI18n } from '@fnb/i18n';

import type { Locale } from '@fnb/contract';
import type { RenderResult } from '@testing-library/react';
import type { i18n as I18nInstance } from 'i18next';
import type { ReactElement } from 'react';

/** Renders a component with real translations, the way an app mounts it. */
export function renderWithI18n(
  ui: ReactElement,
  locale: Locale = 'vi',
): RenderResult & { i18n: I18nInstance } {
  const i18n = createI18n({ locale, plugins: [initReactI18next] });
  return { ...render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>), i18n };
}
