import { z } from 'zod';

/** Languages supported by every app. Vietnamese is the default and the fallback (D-13). */
export const LOCALES = ['vi', 'en'] as const;

/** Default and fallback language. */
export const DEFAULT_LOCALE = 'vi' satisfies (typeof LOCALES)[number];

/** Schema of a supported language code. */
export const localeSchema = z.enum(LOCALES);

/** A supported language code. */
export type Locale = z.infer<typeof localeSchema>;
