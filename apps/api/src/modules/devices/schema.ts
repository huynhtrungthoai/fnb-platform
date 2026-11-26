import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { branchId, standardColumns, timestamptz } from '../../db/columns.js';
import { branches } from '../branches/schema.js';

import type { DeviceKind } from '@fnb/contract';

/**
 * Registered POS and KDS devices (CORE-30, CORE-31). Revoked devices stay, so their code is
 * never handed out again and their invoices keep pointing at them.
 */
export const devices = pgTable(
  'devices',
  {
    ...standardColumns(),
    branchId: branchId().references(() => branches.id),
    /** `<branch code>-<P|H|K><NN>`: the prefix of invoice numbers issued offline. */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    kind: text('kind').$type<DeviceKind>().notNull(),
    /** SHA-256 of the device token sent in `X-Device-Token`. */
    tokenHash: text('token_hash').notNull().unique(),
    /** Mixed into PIN hashes of the offline snapshot (06 section 7.3); never sent again. */
    secretKey: text('secret_key').notNull(),
    revokedAt: timestamptz('revoked_at'),
    revokedBy: uuid('revoked_by'),
    lastSeenAt: timestamptz('last_seen_at'),
    lastUserId: uuid('last_user_id'),
    appVersion: text('app_version'),
  },
  (table) => [index('devices_branch_idx').on(table.branchId)],
);
