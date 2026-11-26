import { defineConfig } from 'drizzle-kit';

// Used by `pnpm db:generate` only. Migrations are applied by `pnpm db:migrate`
// (apps/api/src/db/migrate.ts), which reads the generated SQL files in `drizzle/`.
export default defineConfig({
  dialect: 'postgresql',
  // One schema file per API module; `src/db/schema.ts` re-exports them all.
  schema: './src/modules/**/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
});
