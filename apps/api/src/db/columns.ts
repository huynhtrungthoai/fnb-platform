import { bigint, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core';

import { uuidv7 } from '@fnb/utils';

import type { LocalizedText } from '@fnb/contract';

/**
 * Standard column helpers (plans/04-architecture.md, "Nguyen tac du lieu").
 * Every table builds its columns from these so ids, timestamps and money look the same everywhere.
 */

/** UUID v7 primary key. The client may send its own id (offline POS); otherwise one is generated. */
export const primaryId = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** A UTC timestamp column (`timestamptz`), read and written as `Date`. */
export const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/** `created_at` and `updated_at`; `updated_at` is refreshed on every update made through Drizzle. */
export const timestamps = () => ({
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

/** Id of the user who created the row; null for rows created by the system (seed, sync). */
export const createdBy = () => uuid('created_by');

/** The four standard columns: `id`, `created_at`, `updated_at`, `created_by`. */
export const standardColumns = () => ({
  id: primaryId(),
  ...timestamps(),
  createdBy: createdBy(),
});

/** Soft delete marker for catalog data; null means the row is live. */
export const softDelete = () => ({ deletedAt: timestamptz('deleted_at') });

/** Branch of an operational row. Required on every operational table. */
export const branchId = () => uuid('branch_id').notNull();

/** Display name stored in both languages as `{ vi, en? }`. */
export const localizedText = (name: string) => jsonb(name).$type<LocalizedText>();

/** Money in whole VND. `bigint` in the database, a safe integer in code. */
export const moneyVnd = (name: string) => bigint(name, { mode: 'number' });
