import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { primaryId, timestamptz } from '../../db/columns.js';
import { users } from '../users/schema.js';

/**
 * Refresh tokens (CORE-15). One session is a chain of tokens: each refresh marks the token used
 * and issues the next one. Only a SHA-256 of the token is stored. A used token that comes back
 * means it was stolen, so the whole session ends.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: primaryId(),
    sessionId: uuid('session_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Set for a staff session on a POS device (M1-13). */
    deviceId: uuid('device_id'),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    expiresAt: timestamptz('expires_at').notNull(),
    /** When it was exchanged for the next token. */
    usedAt: timestamptz('used_at'),
    /** When the session ended (logout, disabled account, reuse detected). */
    revokedAt: timestamptz('revoked_at'),
  },
  (table) => [
    index('refresh_tokens_session_idx').on(table.sessionId),
    index('refresh_tokens_user_idx').on(table.userId),
  ],
);
