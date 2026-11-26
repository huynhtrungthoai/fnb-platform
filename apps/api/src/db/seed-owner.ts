import { randomInt } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { passwordSchema, pinSchema } from '@fnb/contract';

import { DEFAULT_BRANCH_SETTINGS } from '../modules/branches/branches.service.js';
import { branches, branchSettings } from '../modules/branches/schema.js';
import { roles, userRoleAssignments } from '../modules/rbac/schema.js';
import { CredentialHasher } from '../modules/users/credential-hasher.js';
import { generatePassword } from '../modules/users/reset-owner-password.js';
import { users } from '../modules/users/schema.js';

import type { Env } from '../config/env.js';
import type { Database } from './database.js';

/** Development values from `.env.example` start with this; production refuses them. */
const DEV_VALUE_PREFIX = 'dev-only-';

/**
 * Creates the super admin (D-29): the owner group on all branches, a password for Admin and a
 * PIN for POS. Runs only while no super admin exists, so a second seed never touches it.
 * Without configured values (production) both secrets are generated and printed once.
 */
export async function seedOwner(
  db: Database,
  env: Env,
  log: (message: string) => void,
): Promise<void> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.credentialType, 'password'));
  if (existing) {
    log('seed: super admin exists, left alone');
    return;
  }
  const configured = env.SEED_OWNER_PASSWORD ?? '';
  if (env.NODE_ENV === 'production' && configured.startsWith(DEV_VALUE_PREFIX)) {
    throw new Error('SEED_OWNER_PASSWORD: the development value must not be used in production');
  }
  const password = configured.length > 0 ? configured : generatePassword();
  const pin = env.SEED_OWNER_PIN ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
  if (!passwordSchema.safeParse(password).success || !pinSchema.safeParse(pin).success) {
    throw new Error(
      'SEED_OWNER_PASSWORD needs 10+ characters with a letter and a digit; SEED_OWNER_PIN six digits',
    );
  }
  const [ownerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, 'owner'));
  if (!ownerRole) {
    throw new Error('The owner group is missing; the permission seed must run first');
  }
  const hasher = new CredentialHasher(env);
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .insert(users)
      .values({
        username: env.SEED_OWNER_USERNAME,
        fullName: env.SEED_OWNER_FULL_NAME,
        credentialType: 'password',
        passwordHash: await hasher.hash(password),
        pinHash: await hasher.hash(pin),
        mustChangePin: false,
      })
      .returning({ id: users.id });
    if (!owner) {
      throw new Error('Owner insert returned no row');
    }
    await tx
      .insert(userRoleAssignments)
      .values({ userId: owner.id, branchId: null, roleId: ownerRole.id });
  });
  log(`seed: super admin "${env.SEED_OWNER_USERNAME}" created (Admin: password, POS: PIN)`);
  if (configured.length === 0) {
    log(`seed: generated password (shown once): ${password}`);
  }
  if (env.SEED_OWNER_PIN === undefined) {
    log(`seed: generated POS PIN (shown once): ${pin}`);
  }
}

/** Creates one sample branch with default settings when there is no branch at all. */
export async function seedSampleBranch(
  db: Database,
  env: Env,
  log: (message: string) => void,
): Promise<void> {
  const [any] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (any) {
    log('seed: branches exist, no sample branch added');
    return;
  }
  await db.transaction(async (tx) => {
    const [branch] = await tx
      .insert(branches)
      .values({ code: env.SEED_BRANCH_CODE, name: env.SEED_BRANCH_NAME })
      .returning({ id: branches.id });
    if (!branch) {
      throw new Error('Branch insert returned no row');
    }
    await tx.insert(branchSettings).values({ ...DEFAULT_BRANCH_SETTINGS, branchId: branch.id });
  });
  log(`seed: sample branch ${env.SEED_BRANCH_CODE} created`);
}
