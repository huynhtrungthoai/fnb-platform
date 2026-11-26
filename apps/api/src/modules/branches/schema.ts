import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

import { standardColumns, timestamps } from '../../db/columns.js';

/** Receipt header and footer of a branch. */
export interface ReceiptInfo {
  businessName: string | null;
  address: string | null;
  phone: string | null;
  taxCode: string | null;
  footer: string | null;
}

/** Bank account that receives QR transfers. */
export interface BankAccount {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

/** Branches (CORE-01). Never deleted: a branch is deactivated so its history stays readable. */
export const branches = pgTable('branches', {
  ...standardColumns(),
  /** Invoice number prefix; upper-case, unique. */
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isActive: boolean('is_active').notNull().default(true),
});

/**
 * Settings of a branch (CORE-02), one row per branch. Owned by the `branches` module; other
 * modules read them through `BranchesService` and keep their own settings in their own tables.
 */
export const branchSettings = pgTable('branch_settings', {
  branchId: uuid('branch_id')
    .primaryKey()
    .references(() => branches.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull(),
  /** Wall-clock `HH:mm` in the branch time zone. */
  openTime: text('open_time').notNull(),
  closeTime: text('close_time').notNull(),
  dayCutoffTime: text('day_cutoff_time').notNull(),
  /** A changed cutoff waits here until the business day in `pending_day_cutoff_from` starts. */
  pendingDayCutoffTime: text('pending_day_cutoff_time'),
  pendingDayCutoffFrom: date('pending_day_cutoff_from', { mode: 'string' }),
  /** Percentages are stored as basis points (1% = 100) so no floating point is involved. */
  taxRateBps: integer('tax_rate_bps').notNull().default(0),
  serviceChargeBps: integer('service_charge_bps').notNull().default(0),
  receipt: jsonb('receipt').$type<ReceiptInfo>().notNull(),
  bankAccount: jsonb('bank_account').$type<BankAccount>(),
  ...timestamps(),
});
