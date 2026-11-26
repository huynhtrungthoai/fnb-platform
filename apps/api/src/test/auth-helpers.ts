import { eq } from 'drizzle-orm';

import { uuidv7 } from '@fnb/utils';

import { BRANCH_HEADER } from '../common/decorators/access.decorators.js';
import { AccessTokenService } from '../modules/auth/session/access-token.service.js';
import { SessionStore } from '../modules/auth/session/session-store.js';
import { DEFAULT_BRANCH_SETTINGS } from '../modules/branches/branches.service.js';
import { branches, branchSettings } from '../modules/branches/schema.js';
import { RbacService } from '../modules/rbac/rbac.service.js';
import { rolePermissions, roles, userRoleAssignments } from '../modules/rbac/schema.js';
import { CredentialHasher } from '../modules/users/credential-hasher.js';
import { users } from '../modules/users/schema.js';

import type { TestApp } from './test-app.js';
import type { DefaultRoleCode, PermissionCode } from '@fnb/contract';

/** Id of a default group. */
export async function roleIdOf(test: TestApp, code: DefaultRoleCode): Promise<string> {
  const [role] = await test.db.select({ id: roles.id }).from(roles).where(eq(roles.code, code));
  if (!role) {
    throw new Error(`Default group ${code} is missing; did reset() run?`);
  }
  return role.id;
}

/** Creates a custom group holding exactly these permissions. */
export async function createCustomRole(
  test: TestApp,
  name: string,
  codes: readonly PermissionCode[],
): Promise<string> {
  const [role] = await test.db
    .insert(roles)
    .values({
      name: { vi: name },
      limits: { maxDiscountPercent: null, maxPayOutAmount: null, maxRefundAmount: null },
    })
    .returning({ id: roles.id });
  const roleId = role?.id ?? '';
  if (codes.length > 0) {
    await test.db
      .insert(rolePermissions)
      .values(codes.map((permissionCode) => ({ roleId, permissionCode })));
  }
  return roleId;
}

/**
 * Makes sure an account exists for the id, without a PIN (tests sign in through `openSession`).
 * The username is derived from the id so it stays unique.
 */
export async function ensureUser(
  test: TestApp,
  userId: string,
  values: { fullName?: string; isActive?: boolean } = {},
): Promise<void> {
  await test.db
    .insert(users)
    .values({
      id: userId,
      username: `u${userId.replaceAll('-', '').slice(-16)}`,
      fullName: values.fullName ?? 'Test user',
      isActive: values.isActive ?? true,
      mustChangePin: false,
    })
    .onConflictDoNothing();
}

/** Assigns a group to a user at a branch; `branchId: null` is the all-branches assignment. */
export async function assignRole(
  test: TestApp,
  assignment: { userId: string; branchId: string | null; roleId: string },
): Promise<void> {
  await ensureUser(test, assignment.userId);
  await test.db.insert(userRoleAssignments).values(assignment);
  await test.app.get(RbacService).invalidateUsers([assignment.userId]);
}

/** A signed-in caller for tests: an active session and its access token. */
export interface TestSession {
  userId: string;
  sessionId: string;
  token: string;
  /** Headers for a request at a branch (or without one). */
  headers: (branchId?: string) => Record<string, string>;
}

/** Opens a session for a user without going through the login endpoint. */
export async function openSession(
  test: TestApp,
  userId: string,
  claims: { deviceId?: string; mustChangePin?: boolean; ttlSeconds?: number } = {},
): Promise<TestSession> {
  const sessionId = uuidv7();
  await test.app.get(SessionStore).activate(sessionId, userId, 3600);
  const token = await test.app
    .get(AccessTokenService)
    .sign({ userId, sessionId, ...claims }, claims.ttlSeconds);
  return {
    userId,
    sessionId,
    token,
    headers: (branchId) => ({
      authorization: `Bearer ${token}`,
      ...(branchId ? { [BRANCH_HEADER]: branchId } : {}),
    }),
  };
}

/** Shortcut: a new user id assigned to a default group at a branch (or all branches), signed in. */
export async function signInAs(
  test: TestApp,
  roleCode: DefaultRoleCode,
  branchId: string | null,
): Promise<TestSession> {
  const userId = uuidv7();
  await assignRole(test, { userId, branchId, roleId: await roleIdOf(test, roleCode) });
  return openSession(test, userId);
}

/** Creates an active branch with default settings and returns its id. */
export async function createBranch(
  test: TestApp,
  code: string,
  name = `Chi nhánh ${code}`,
): Promise<string> {
  const [branch] = await test.db
    .insert(branches)
    .values({ code, name })
    .returning({ id: branches.id });
  const branchId = branch?.id ?? '';
  await test.db.insert(branchSettings).values({ ...DEFAULT_BRANCH_SETTINGS, branchId });
  return branchId;
}

/**
 * Creates an account that can sign in through `POST /auth/login`: a staff member with a PIN, or
 * the super admin with a password (and a POS PIN). Optionally assigns a default group.
 */
export async function createAccount(
  test: TestApp,
  account: {
    username: string;
    pin?: string;
    password?: string;
    mustChangePin?: boolean;
    role?: { code: DefaultRoleCode; branchId: string | null };
  },
): Promise<string> {
  const hasher = test.app.get(CredentialHasher);
  const userId = uuidv7();
  await test.db.insert(users).values({
    id: userId,
    username: account.username,
    fullName: account.username,
    credentialType: account.password ? 'password' : 'pin',
    pinHash: await hasher.hash(account.pin ?? '000000'),
    passwordHash: account.password ? await hasher.hash(account.password) : null,
    mustChangePin: account.mustChangePin ?? false,
  });
  if (account.role) {
    await assignRole(test, {
      userId,
      branchId: account.role.branchId,
      roleId: await roleIdOf(test, account.role.code),
    });
  }
  return userId;
}
