import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DB } from '../../../db/database.js';
import { refreshTokens } from '../schema.js';

import type { Database } from '../../../db/database.js';

/** A stored refresh token. */
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;

/** Queries on `refresh_tokens`. Only the `auth` module writes this table. */
@Injectable()
export class RefreshTokenRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async insert(values: typeof refreshTokens.$inferInsert): Promise<void> {
    await this.db.insert(refreshTokens).values(values);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return row;
  }

  /** Marks a token used. False when another request used it first. */
  async markUsed(id: string, at: Date): Promise<boolean> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ usedAt: at })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.usedAt)))
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.sessionId, sessionId), isNull(refreshTokens.revokedAt)));
  }

  async revokeUser(userId: string, at: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
