import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

/** Injection token of the validated environment. */
export const ENV = Symbol('ENV');

const packageJsonSchema = z.object({ version: z.string() });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  S3_ENDPOINT: z.url({ protocol: /^https?$/ }),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
});

/** Validated environment of the API. */
export type Env = z.infer<typeof envSchema> & { APP_VERSION: string };

/** Thrown at startup when the environment is incomplete or malformed. */
export class EnvValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid environment:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/** Validates a set of variables. Exported separately so tests do not touch `process.env`. */
export function parseEnv(source: Record<string, string | undefined>): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}

/**
 * Loads a dotenv file into `process.env` without overriding variables that are already set.
 * Looks in the working directory and in the repo root (two levels up from `apps/api`).
 * In development, a missing `.env` falls back to `.env.example` so a fresh clone starts;
 * production never reads a file and takes everything from the real environment.
 */
export function loadDotEnv(cwd: string = process.cwd()): string | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  const directories = [cwd, resolve(cwd, '../..')];
  for (const fileName of ['.env', '.env.example']) {
    for (const directory of directories) {
      const filePath = resolve(directory, fileName);
      if (existsSync(filePath)) {
        process.loadEnvFile(filePath);
        return filePath;
      }
    }
  }
  return null;
}

function readAppVersion(): string {
  try {
    // `src/config` and `dist/config` are both two levels below the package root.
    const raw: unknown = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
    );
    return packageJsonSchema.parse(raw).version;
  } catch {
    return '0.0.0';
  }
}

/** Reads dotenv files, validates `process.env` and returns the typed environment. */
export function loadEnv(): Env {
  const loadedFile = loadDotEnv();
  if (loadedFile?.endsWith('.env.example')) {
    console.warn(`No .env file found; using development defaults from ${loadedFile}`);
  }
  return { ...parseEnv(process.env), APP_VERSION: readAppVersion() };
}
