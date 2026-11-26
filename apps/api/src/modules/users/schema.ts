import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { standardColumns, timestamptz } from '../../db/columns.js';

import type { CredentialType } from '@fnb/contract';

/**
 * Staff accounts (CORE-10, D-29). Only Argon2id hashes are stored; nobody can read a PIN back.
 * Accounts are never deleted: they are disabled, so orders and logs keep pointing at a person.
 */
export const users = pgTable('users', {
  ...standardColumns(),
  /** Unique in the business, lower-case, never changed after creation. */
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  avatarMediaId: uuid('avatar_media_id'),
  /** What Admin login compares against: `pin` for staff, `password` for the super admin. */
  credentialType: text('credential_type').$type<CredentialType>().notNull().default('pin'),
  pinHash: text('pin_hash'),
  /** Only the super admin has one. */
  passwordHash: text('password_hash'),
  /** The PIN was set by someone else (initial or reset) and must be changed at next sign-in. */
  mustChangePin: boolean('must_change_pin').notNull().default(true),
  /** Wrong PINs or passwords in a row, shared by Admin, POS and on-the-spot approval. */
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedAt: timestamptz('locked_at'),
  /** Set only for the super admin, whose lock lifts by itself. */
  lockedUntil: timestamptz('locked_until'),
  /** False when an admin disabled the account. */
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamptz('last_login_at'),
});
