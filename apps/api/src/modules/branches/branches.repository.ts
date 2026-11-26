import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';

import { DB } from '../../db/database.js';
import { branches, branchSettings } from './schema.js';

import type { Database, Executor } from '../../db/database.js';
import type { BranchReach } from '../rbac/access.js';
import type { SQL } from 'drizzle-orm';

/** A branch row. */
export type BranchRow = typeof branches.$inferSelect;
/** A branch settings row. */
export type BranchSettingsRow = typeof branchSettings.$inferSelect;

/** Queries on `branches` and `branch_settings`. */
@Injectable()
export class BranchesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string, executor: Executor = this.db): Promise<BranchRow | undefined> {
    const [row] = await executor.select().from(branches).where(eq(branches.id, id));
    return row;
  }

  async findByCode(code: string, executor: Executor = this.db): Promise<BranchRow | undefined> {
    const [row] = await executor.select().from(branches).where(eq(branches.code, code));
    return row;
  }

  findByIds(ids: readonly string[]): Promise<BranchRow[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.db
      .select()
      .from(branches)
      .where(inArray(branches.id, [...ids]))
      .orderBy(asc(branches.code));
  }

  /** Branches inside a caller's reach, ordered by code. */
  list(options: { reach?: BranchReach; isActiveOnly?: boolean } = {}): Promise<BranchRow[]> {
    const conditions: SQL[] = [];
    const { reach } = options;
    if (reach && !reach.isAll) {
      if (reach.branchIds.length === 0) {
        return Promise.resolve([]);
      }
      conditions.push(inArray(branches.id, reach.branchIds));
    } else if (reach && reach.exceptBranchIds.length > 0) {
      conditions.push(notInArray(branches.id, reach.exceptBranchIds));
    }
    if (options.isActiveOnly) {
      conditions.push(eq(branches.isActive, true));
    }
    return this.db
      .select()
      .from(branches)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(branches.code));
  }

  async insert(
    values: typeof branches.$inferInsert,
    settings: Omit<typeof branchSettings.$inferInsert, 'branchId'>,
  ): Promise<BranchRow> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(branches).values(values).returning();
      if (!row) {
        throw new Error('Branch insert returned no row');
      }
      await tx.insert(branchSettings).values({ ...settings, branchId: row.id });
      return row;
    });
  }

  async update(
    id: string,
    values: Partial<typeof branches.$inferInsert>,
  ): Promise<BranchRow | undefined> {
    const [row] = await this.db.update(branches).set(values).where(eq(branches.id, id)).returning();
    return row;
  }

  async findSettings(
    branchId: string,
    executor: Executor = this.db,
  ): Promise<BranchSettingsRow | undefined> {
    const [row] = await executor
      .select()
      .from(branchSettings)
      .where(eq(branchSettings.branchId, branchId));
    return row;
  }

  async updateSettings(
    branchId: string,
    values: Partial<typeof branchSettings.$inferInsert>,
  ): Promise<BranchSettingsRow | undefined> {
    const [row] = await this.db
      .update(branchSettings)
      .set(values)
      .where(eq(branchSettings.branchId, branchId))
      .returning();
    return row;
  }
}
