import type { DEFAULT_NAMESPACE, resources } from './resources.js';

// Makes `t()` type-safe everywhere `@fnb/i18n` is imported: a misspelled key is a type error
// (plans/40-i18n-copy.md section 2). Key types come from the Vietnamese files.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)['vi'];
  }
}

/** Translation function shape for code outside React, which receives `t` as a parameter. */
export type { TFunction } from 'i18next';
