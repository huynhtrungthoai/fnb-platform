import { z } from 'zod';

/**
 * Display name of catalog data stored in both languages (plans/40-i18n-copy.md section 4).
 * `vi` is required. Both values are trimmed, and an empty `en` is dropped at parse time
 * because `??` does not treat an empty string as missing.
 */
export const localizedTextSchema = z
  .object({
    vi: z.string().trim().min(1),
    en: z.string().trim().optional(),
  })
  .transform(({ vi, en }): { vi: string; en?: string } => (en ? { vi, en } : { vi }));

/** A display name in Vietnamese with an optional English version. */
export type LocalizedText = z.infer<typeof localizedTextSchema>;
