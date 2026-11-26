import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, isNull, like } from 'drizzle-orm';

import { DB } from '../../db/database.js';
import { devices } from './schema.js';

import type { Database } from '../../db/database.js';
import type { SQL } from 'drizzle-orm';

/** A device row, secrets included. Never sent to a client as is. */
export type DeviceRow = typeof devices.$inferSelect;

/** Queries on `devices`. Only the `devices` module writes this table. */
@Injectable()
export class DevicesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string): Promise<DeviceRow | undefined> {
    const [row] = await this.db.select().from(devices).where(eq(devices.id, id));
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<DeviceRow | undefined> {
    const [row] = await this.db.select().from(devices).where(eq(devices.tokenHash, tokenHash));
    return row;
  }

  /** Devices of some branches (undefined: every branch). */
  list(filter: {
    branchIds?: readonly string[];
    status: 'active' | 'revoked' | 'all';
  }): Promise<DeviceRow[]> {
    if (filter.branchIds?.length === 0) {
      return Promise.resolve([]);
    }
    const conditions: SQL[] = [];
    if (filter.branchIds) {
      conditions.push(inArray(devices.branchId, [...filter.branchIds]));
    }
    if (filter.status === 'active') {
      conditions.push(isNull(devices.revokedAt));
    } else if (filter.status === 'revoked') {
      conditions.push(isNotNull(devices.revokedAt));
    }
    return this.db
      .select()
      .from(devices)
      .where(and(...conditions))
      .orderBy(asc(devices.code));
  }

  /** Codes already given out with this prefix, revoked devices included. */
  async codesWithPrefix(prefix: string): Promise<string[]> {
    const escaped = prefix.replace(/[\\%_]/g, (char) => `\\${char}`);
    const rows = await this.db
      .select({ code: devices.code })
      .from(devices)
      .where(like(devices.code, `${escaped}%`));
    return rows.map((row) => row.code);
  }

  async insert(values: typeof devices.$inferInsert): Promise<DeviceRow> {
    const [row] = await this.db.insert(devices).values(values).returning();
    if (!row) {
      throw new Error('Device insert returned no row');
    }
    return row;
  }

  async update(
    id: string,
    values: Partial<typeof devices.$inferInsert>,
  ): Promise<DeviceRow | undefined> {
    const [row] = await this.db.update(devices).set(values).where(eq(devices.id, id)).returning();
    return row;
  }
}
