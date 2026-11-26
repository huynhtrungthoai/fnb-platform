import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { timestamps } from '../../db/columns.js';

/**
 * Small key/value store for facts about the installation itself, for example when the seed
 * last ran. Business configuration does not belong here; it lives in the owning module.
 */
export const systemMeta = pgTable('system_meta', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  ...timestamps(),
});
