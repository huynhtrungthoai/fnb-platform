import { z } from 'zod';

import { branchSummarySchema } from './branches.js';
import { localizedTextSchema } from './localized-text.js';
import { permissionCodeSchema, roleLimitsSchema } from './permissions/index.js';
import { userSchema } from './users.js';

/**
 * Body of `POST /auth/login` (CORE-12, D-29). `secret` is a 6-digit PIN for staff or the
 * password of the super admin; the server picks which by the account, so the field takes any
 * string and the client never says which one it is.
 */
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(60),
  secret: z.string().min(1).max(200),
});

/** Body of `POST /auth/login`. */
export type LoginInput = z.infer<typeof loginSchema>;

/** Body of `POST /auth/refresh` and `POST /auth/logout`. */
export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

/** Body of `POST /auth/refresh`. */
export type RefreshInput = z.infer<typeof refreshSchema>;

/** Tokens of a session (CORE-15): a short access token and a rotating refresh token. */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.iso.datetime(),
  /** Single use: every refresh returns a new one, and reusing an old one ends the session. */
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.iso.datetime(),
  /** The PIN is temporary: the client must show "change PIN" before anything else. */
  mustChangePin: z.boolean(),
});

/** Tokens of a session. */
export type AuthTokens = z.infer<typeof authTokensSchema>;

/** What the caller may do at one branch (06 section 7.2). */
export const meBranchSchema = z.object({
  branch: branchSummarySchema,
  role: z.object({ id: z.uuid(), code: z.string().nullable(), name: localizedTextSchema }),
  /** The grant comes from the all-branches assignment. */
  isAllBranches: z.boolean(),
  permissions: z.array(permissionCodeSchema),
  limits: roleLimitsSchema,
});

/** What the caller may do at one branch. */
export type MeBranch = z.infer<typeof meBranchSchema>;

/** Response of `GET /auth/me`: the caller and their permissions at each branch. */
export const meSchema = z.object({
  user: userSchema,
  /** The caller has an all-branches assignment (business-level screens, "all branches" reports). */
  hasAllBranches: z.boolean(),
  branches: z.array(meBranchSchema),
  /** Business-wide permissions, from the all-branches assignment only. */
  businessPermissions: z.array(permissionCodeSchema),
  /** Changes whenever the caller's groups or assignments change; clients reload when it does. */
  permissionsVersion: z.string(),
});

/** Response of `GET /auth/me`. */
export type Me = z.infer<typeof meSchema>;
