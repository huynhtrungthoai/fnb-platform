import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv } from './env.js';

const validSource = {
  NODE_ENV: 'test',
  API_PORT: '4100',
  CORS_ORIGINS: 'http://localhost:5173, http://localhost:5174',
  JWT_SECRET: 'unit-test-secret-0123456789-abcdefghij',
  DATABASE_URL: 'postgres://fnb:secret@localhost:5432/fnb',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'fnb-local',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
};

describe('parseEnv', () => {
  it('parses and converts a complete environment', () => {
    const env = parseEnv(validSource);
    expect(env.API_PORT).toBe(4100);
    expect(env.NODE_ENV).toBe('test');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });

  it('applies defaults for optional variables', () => {
    const env = parseEnv({
      ...validSource,
      NODE_ENV: undefined,
      API_PORT: undefined,
      CORS_ORIGINS: undefined,
    });
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it('lists every missing or malformed variable', () => {
    let caught: unknown;
    try {
      parseEnv({ ...validSource, DATABASE_URL: undefined, REDIS_URL: 'http://localhost:6379' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(EnvValidationError);
    const issues = caught instanceof EnvValidationError ? caught.issues.join('\n') : '';
    expect(issues).toContain('DATABASE_URL');
    expect(issues).toContain('REDIS_URL');
  });

  it('rejects a port outside the valid range', () => {
    expect(() => parseEnv({ ...validSource, API_PORT: '70000' })).toThrow(EnvValidationError);
    expect(() => parseEnv({ ...validSource, API_PORT: 'abc' })).toThrow(EnvValidationError);
  });

  it('refuses a short JWT secret, and the development secret in production', () => {
    expect(() => parseEnv({ ...validSource, JWT_SECRET: 'too-short' })).toThrow(EnvValidationError);
    expect(() =>
      parseEnv({
        ...validSource,
        NODE_ENV: 'production',
        JWT_SECRET: 'dev-only-jwt-secret-change-me-0123456789',
      }),
    ).toThrow(/development secret/);
  });
});
