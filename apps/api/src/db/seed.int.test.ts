import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiSuccessSchema, authTokensSchema, meSchema } from '@fnb/contract';

import { ENV } from '../config/env.js';
import { branches } from '../modules/branches/schema.js';
import { users } from '../modules/users/schema.js';
import { createTestApp } from '../test/test-app.js';
import { runSeed, seedSteps } from './seed.js';

import type { Env } from '../config/env.js';
import type { TestApp } from '../test/test-app.js';

let test: TestApp;
let env: Env;

beforeAll(async () => {
  test = await createTestApp();
  env = {
    ...test.app.get<Env>(ENV),
    SEED_OWNER_USERNAME: 'owner',
    SEED_OWNER_PASSWORD: 'dev-only-owner-2026',
    SEED_OWNER_PIN: '135790',
    SEED_BRANCH_CODE: 'Q1',
    SEED_BRANCH_NAME: 'Chi nhánh Quận 1',
  };
});

beforeEach(async () => {
  await test.reset();
});

afterAll(async () => {
  await test.close();
});

describe('seed (M1-16)', () => {
  it('creates the super admin and a sample branch once; the owner signs in to Admin', async () => {
    const log: string[] = [];
    await runSeed(
      test.db,
      seedSteps(env, (line) => log.push(line)),
    );
    await runSeed(
      test.db,
      seedSteps(env, (line) => log.push(line)),
    );
    expect(await test.db.select().from(users)).toHaveLength(1);
    expect(await test.db.select().from(branches)).toHaveLength(1);
    expect(log).toContain('seed: super admin exists, left alone');

    const login = await test.http
      .post('/auth/login')
      .send({ username: 'owner', secret: 'dev-only-owner-2026' })
      .expect(200);
    const tokens = apiSuccessSchema(authTokensSchema).parse(login.body).data;
    const me = apiSuccessSchema(meSchema).parse(
      (
        await test.http
          .get('/auth/me')
          .set('authorization', `Bearer ${tokens.accessToken}`)
          .expect(200)
      ).body,
    ).data;
    expect(me.hasAllBranches).toBe(true);
    expect(me.branches.map((item) => item.branch.code)).toEqual(['Q1']);
    // The POS PIN does not open Admin.
    await test.http.post('/auth/login').send({ username: 'owner', secret: '135790' }).expect(401);
  });

  it('generates and prints the secrets when none are configured, and refuses dev values in production', async () => {
    const log: string[] = [];
    const bare = { ...env, SEED_OWNER_PASSWORD: undefined, SEED_OWNER_PIN: undefined };
    await runSeed(
      test.db,
      seedSteps(bare, (line) => log.push(line)),
    );
    expect(log.some((line) => line.startsWith('seed: generated password'))).toBe(true);
    expect(log.some((line) => line.startsWith('seed: generated POS PIN'))).toBe(true);

    await test.reset();
    await expect(runSeed(test.db, seedSteps({ ...env, NODE_ENV: 'production' }))).rejects.toThrow(
      /development value/,
    );
  });
});
