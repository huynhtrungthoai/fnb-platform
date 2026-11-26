/**
 * Every table of the API, re-exported for the typed Drizzle client.
 * Each module owns its tables in `src/modules/<domain>/schema.ts` and only that module writes them.
 */
export * from '../modules/audit/schema.js';
export * from '../modules/rbac/schema.js';
export * from '../modules/system/schema.js';
