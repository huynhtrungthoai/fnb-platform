import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';

/** Injection token of the Drizzle client. */
export const DB = Symbol('DB');
/** Injection token of the underlying connection pool. */
export const PG_POOL = Symbol('PG_POOL');

/** The typed Drizzle client. */
export type Database = NodePgDatabase<typeof schema>;

/** A transaction handle; repositories accept it in place of the client. */
export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** Either the client or a transaction: what a repository method runs its queries on. */
export type Executor = Database | Transaction;

/** Opens a connection pool. The caller closes it with `pool.end()`. */
export function createPool(connectionString: string, max = 10): pg.Pool {
  return new pg.Pool({ connectionString, max });
}

/** Wraps a pool in the typed Drizzle client. Column names are snake_case in the database. */
export function createDatabase(pool: pg.Pool): Database {
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}
