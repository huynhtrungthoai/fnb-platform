import { getTableConfig, pgTable, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { isUuidV7 } from '@fnb/utils';

import { branchId, localizedText, moneyVnd, softDelete, standardColumns } from './columns.js';

const sample = pgTable('sample_rows', {
  ...standardColumns(),
  ...softDelete(),
  branchId: branchId(),
  name: localizedText('name').notNull(),
  amount: moneyVnd('amount').notNull(),
  note: text('note'),
});

const columns = new Map(getTableConfig(sample).columns.map((column) => [column.name, column]));

describe('standard column helpers', () => {
  it('adds id, created_at, updated_at and created_by', () => {
    expect([...columns.keys()]).toEqual(
      expect.arrayContaining(['id', 'created_at', 'updated_at', 'created_by', 'deleted_at']),
    );
    expect(columns.get('id')?.primary).toBe(true);
    expect(columns.get('id')?.getSQLType()).toBe('uuid');
  });

  it('generates a UUID v7 when the client sends no id', () => {
    expect(isUuidV7(columns.get('id')?.defaultFn?.())).toBe(true);
  });

  it('stores time as timestamptz', () => {
    for (const name of ['created_at', 'updated_at', 'deleted_at']) {
      expect(columns.get(name)?.getSQLType()).toBe('timestamp with time zone');
    }
    expect(columns.get('created_at')?.notNull).toBe(true);
    expect(columns.get('updated_at')?.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  it('requires branch_id and stores money as bigint and names as jsonb', () => {
    expect(columns.get('branch_id')?.notNull).toBe(true);
    expect(columns.get('amount')?.getSQLType()).toBe('bigint');
    expect(columns.get('name')?.getSQLType()).toBe('jsonb');
  });
});
