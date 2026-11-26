import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { toLimitOffset } from '../../common/http/pagination.js';
import { DB } from '../../db/database.js';
import { users } from './schema.js';

import type { Database, Executor } from '../../db/database.js';
import type { PaginationQuery, UserListQuery } from '@fnb/contract';
import type { SQL } from 'drizzle-orm';

/** A user row, hashes included. Never sent to a client as is. */
export type UserRow = typeof users.$inferSelect;

/** Filters of the staff list once the caller's reach has been applied. */
export interface UserListFilter {
  /** Only these users; undefined means every user. */
  ids?: readonly string[];
  search?: string;
  status: UserListQuery['status'];
  now: Date;
}

/** Escapes `%`, `_` and `\` so a search term matches literally inside `ILIKE`. */
const escapeLike = (term: string): string => term.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Queries on `users`. Only the `users` module writes this table. */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string, executor: Executor = this.db): Promise<UserRow | undefined> {
    const [row] = await executor.select().from(users).where(eq(users.id, id));
    return row;
  }

  async findByUsername(
    username: string,
    executor: Executor = this.db,
  ): Promise<UserRow | undefined> {
    const [row] = await executor.select().from(users).where(eq(users.username, username));
    return row;
  }

  /** Ids of every account; the service filters them by the caller's reach. */
  async listIds(executor: Executor = this.db): Promise<string[]> {
    const rows = await executor.select({ id: users.id }).from(users);
    return rows.map((row) => row.id);
  }

  findByIds(ids: readonly string[], executor: Executor = this.db): Promise<UserRow[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return executor
      .select()
      .from(users)
      .where(inArray(users.id, [...ids]));
  }

  /** One page of users, ordered by name, and the total count. */
  async list(
    filter: UserListFilter,
    page: PaginationQuery,
  ): Promise<{ rows: UserRow[]; total: number }> {
    if (filter.ids?.length === 0) {
      return { rows: [], total: 0 };
    }
    const where = and(...this.conditions(filter));
    const { limit, offset } = toLimitOffset(page);
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(asc(users.fullName), asc(users.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  }

  async insert(values: typeof users.$inferInsert, executor: Executor = this.db): Promise<UserRow> {
    const [row] = await executor.insert(users).values(values).returning();
    if (!row) {
      throw new Error('User insert returned no row');
    }
    return row;
  }

  async update(
    id: string,
    values: Partial<typeof users.$inferInsert>,
    executor: Executor = this.db,
  ): Promise<UserRow | undefined> {
    const [row] = await executor.update(users).set(values).where(eq(users.id, id)).returning();
    return row;
  }

  /** Adds one wrong attempt and returns the new count, atomically. */
  async incrementFailedAttempts(id: string): Promise<number> {
    const [row] = await this.db
      .update(users)
      .set({ failedAttempts: sql`${users.failedAttempts} + 1` })
      .where(eq(users.id, id))
      .returning({ failedAttempts: users.failedAttempts });
    return row?.failedAttempts ?? 0;
  }

  /** How many of these users are active. */
  async countActive(ids: readonly string[], executor: Executor = this.db): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const [row] = await executor
      .select({ total: count() })
      .from(users)
      .where(and(inArray(users.id, [...ids]), eq(users.isActive, true)));
    return row?.total ?? 0;
  }

  private conditions(filter: UserListFilter): SQL[] {
    const conditions: SQL[] = [];
    if (filter.ids) {
      conditions.push(inArray(users.id, [...filter.ids]));
    }
    const term = filter.search?.trim() ?? '';
    if (term.length > 0) {
      const pattern = `%${escapeLike(term)}%`;
      const match = or(
        ilike(users.fullName, pattern),
        ilike(users.username, pattern),
        ilike(users.phone, pattern),
      );
      if (match) {
        conditions.push(match);
      }
    }
    // A super admin lock lifts by itself once `locked_until` has passed.
    const isLocked = and(
      isNotNull(users.lockedAt),
      or(isNull(users.lockedUntil), gt(users.lockedUntil, filter.now)),
    );
    switch (filter.status) {
      case 'active': {
        const notLocked = or(
          isNull(users.lockedAt),
          and(isNotNull(users.lockedUntil), lte(users.lockedUntil, filter.now)),
        );
        const active = and(eq(users.isActive, true), notLocked);
        if (active) {
          conditions.push(active);
        }
        break;
      }
      case 'disabled':
        conditions.push(eq(users.isActive, false));
        break;
      case 'locked':
        if (isLocked) {
          conditions.push(isLocked);
        }
        break;
      case 'all':
        break;
    }
    return conditions;
  }
}
