import { randomBytes } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { passwordSchema } from '@fnb/contract';

import { RefreshTokenRepository } from '../auth/session/refresh-token.repository.js';
import { CredentialHasher } from './credential-hasher.js';
import { users } from './schema.js';

import type { Env } from '../../config/env.js';
import type { Database } from '../../db/database.js';

/** A random password that satisfies the rules: letters and digits, 20 characters. */
export function generatePassword(): string {
  const body = randomBytes(15).toString('base64url').replaceAll(/[-_]/g, 'x');
  return `${body.slice(0, 18)}7a`;
}

/**
 * Sets a new password for the super admin (D-29, "Quên mật khẩu"). Runs on the server only
 * (`pnpm --filter @fnb/api cli reset-owner-password`), so it needs access to the machine. It
 * also unlocks the account and revokes its refresh tokens; access tokens already handed out
 * stop at their short expiry.
 */
export async function resetOwnerPassword(
  db: Database,
  env: Env,
  password: string,
  now: Date = new Date(),
): Promise<{ username: string }> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    throw new Error('Password needs at least 10 characters with a letter and a digit');
  }
  const [owner] = await db.select().from(users).where(eq(users.credentialType, 'password'));
  if (!owner) {
    throw new Error('No super admin account exists; run the seed first');
  }
  const passwordHash = await new CredentialHasher(env).hash(parsed.data);
  await db
    .update(users)
    .set({ passwordHash, failedAttempts: 0, lockedAt: null, lockedUntil: null })
    .where(eq(users.id, owner.id));
  await new RefreshTokenRepository(db).revokeUser(owner.id, now);
  return { username: owner.username };
}
