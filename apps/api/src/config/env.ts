import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

/** Injection token of the validated environment. */
export const ENV = Symbol('ENV');

/** Secrets in `.env.example` start with this; production refuses them. */
const DEV_SECRET_PREFIX = 'dev-only-';

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
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(30).default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).default(604_800),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Seed (M1-16): the super admin and a sample branch. Unset secrets are generated and printed.
  SEED_OWNER_USERNAME: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]{3,30}$/)
    .default('owner'),
  SEED_OWNER_FULL_NAME: z.string().trim().min(1).default('Owner'),
  SEED_OWNER_PASSWORD: z.string().optional(),
  SEED_OWNER_PIN: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
  SEED_BRANCH_CODE: z
    .string()
    .regex(/^[A-Z0-9]{2,6}$/)
    .default('Q1'),
  SEED_BRANCH_NAME: z.string().trim().min(1).default('Sample branch'),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  /** Run queue workers in this process (M1-25). `false` for an API instance that only enqueues. */
  QUEUE_WORKERS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
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
  if (
    result.data.NODE_ENV === 'production' &&
    result.data.JWT_SECRET.startsWith(DEV_SECRET_PREFIX)
  ) {
    throw new EnvValidationError([
      'JWT_SECRET: the development secret must not be used in production',
    ]);
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
