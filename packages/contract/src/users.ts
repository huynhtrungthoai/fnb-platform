import { z } from 'zod';

import { branchSummarySchema } from './branches.js';
import { localizedTextSchema } from './localized-text.js';
import { paginationQuerySchema } from './pagination.js';
import { permissionCodeSchema, roleLimitsSchema } from './permissions/index.js';

/**
 * Username (D-29): unique in the business, lower-case letters without accents and digits,
 * 3 to 30 characters, never changed after creation. Upper-case input is lower-cased.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]{3,30}$/);

/** PIN (D-29): exactly six digits, any six; easy PINs are not blocked. */
export const pinSchema = z.string().regex(/^\d{6}$/);

/** Password of the super admin: at least 10 characters with a letter and a digit. */
export const passwordSchema = z
  .string()
  .min(10)
  .max(200)
  .regex(/[A-Za-z]/)
  .regex(/\d/);

/** How an account signs in to Admin: staff use a PIN, the super admin a password (D-29). */
export const credentialTypeSchema = z.enum(['pin', 'password']);

/** How an account signs in to Admin. */
export type CredentialType = z.infer<typeof credentialTypeSchema>;

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+ ().-]{6,20}$/);

/** A permission group as shown next to a user. */
export const roleRefSchema = z.object({
  id: z.uuid(),
  /** Code of a default group, null for a custom one. */
  code: z.string().nullable(),
  name: localizedTextSchema,
});

/** A permission group as shown next to a user. */
export type RoleRef = z.infer<typeof roleRefSchema>;

/** A staff account (CORE-10). Hashes never leave the API. */
export const userSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  avatarMediaId: z.uuid().nullable(),
  credentialType: credentialTypeSchema,
  /** Disabled by an admin: cannot sign in until enabled again. */
  isActive: z.boolean(),
  /** Locked after five wrong PINs or passwords. */
  isLocked: z.boolean(),
  /** Set for the super admin: the lock lifts by itself at this time. */
  lockedUntil: z.iso.datetime().nullable(),
  /** The PIN is temporary and must be changed at the next sign-in. */
  mustChangePin: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** A staff account. */
export type User = z.infer<typeof userSchema>;

/** One assignment as shown next to a user: a group at a branch, or at every branch. */
export const userAssignmentSchema = z.object({
  /** Null for the all-branches assignment. */
  branch: branchSummarySchema.nullable(),
  role: roleRefSchema,
  /** When the assignment was made or last changed. */
  since: z.iso.datetime(),
});

/** One assignment as shown next to a user. */
export type UserAssignment = z.infer<typeof userAssignmentSchema>;

/**
 * A user with the assignments the caller may see: those at branches where the caller holds
 * `user.view`, plus the all-branches one.
 */
export const userWithAssignmentsSchema = userSchema.extend({
  assignments: z.array(userAssignmentSchema),
});

/** A user with assignments, as in the staff list and the staff detail. */
export type UserWithAssignments = z.infer<typeof userWithAssignmentsSchema>;

/** One assignment: a group at a branch, or at all branches when `branchId` is null. */
export const assignmentInputSchema = z.object({
  branchId: z.uuid().nullable(),
  roleId: z.uuid(),
});

/** One assignment to create. */
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

/** Body of `POST /users` (D-29): the initial PIN is temporary. */
export const createUserSchema = z.object({
  id: z.uuid().optional(),
  fullName: z.string().trim().min(1).max(120),
  phone: phoneSchema.nullish().transform((value) => value ?? null),
  username: usernameSchema,
  pin: pinSchema,
  assignments: z
    .array(assignmentInputSchema)
    .min(1)
    .max(50)
    .refine((items) => new Set(items.map((item) => item.branchId ?? 'all')).size === items.length, {
      error: 'One group per branch',
    }),
});

/** Body of `POST /users`. */
export type CreateUser = z.infer<typeof createUserSchema>;
/** Body of `POST /users` before parsing. */
export type CreateUserInput = z.input<typeof createUserSchema>;

/** Body of `PATCH /users/:id`. The username cannot be changed. */
export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    phone: phoneSchema.nullable(),
    avatarMediaId: z.uuid().nullable(),
  })
  .partial();

/** Body of `PATCH /users/:id`. */
export type UpdateUser = z.infer<typeof updateUserSchema>;

/** Body of `PUT /users/:id/assignments`: sets the group at one branch (`branchId: null`: all branches). */
export const setAssignmentSchema = assignmentInputSchema;

/** Body of `PUT /users/:id/assignments`. */
export type SetAssignment = z.infer<typeof setAssignmentSchema>;

/** Branch of `DELETE /users/:id/assignments/:branchId`: a branch id, or `all` for all branches. */
export const assignmentBranchParamSchema = z
  .union([z.literal('all'), z.uuid()])
  .transform((value) => (value === 'all' ? null : value));

/** Query of `GET /users`. */
export const userListQuerySchema = paginationQuerySchema.extend({
  /** Matches name, username or phone. */
  search: z.string().trim().max(60).optional(),
  status: z.enum(['active', 'disabled', 'locked', 'all']).default('all'),
  /** Users assigned at this branch, directly or through an all-branches assignment. */
  branchId: z.uuid().optional(),
  roleId: z.uuid().optional(),
});

/** Query of `GET /users`. */
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** What a user may do at one branch, as shown on "effective permissions" (CORE-29). */
export const userBranchAccessSchema = z.object({
  /** Null for the all-branches assignment itself. */
  branch: branchSummarySchema.nullable(),
  role: roleRefSchema,
  /** The row is the all-branches assignment applied to this branch. */
  isAllBranches: z.boolean(),
  permissions: z.array(permissionCodeSchema),
  limits: roleLimitsSchema,
});

/** What a user may do at one branch. */
export type UserBranchAccess = z.infer<typeof userBranchAccessSchema>;

/** Response of `GET /users/:id/access`. */
export const userAccessSchema = z.object({
  userId: z.uuid(),
  /** The all-branches assignment, when there is one. */
  allBranches: userBranchAccessSchema.nullable(),
  /** One entry per branch where the user can work, with the group that wins there. */
  branches: z.array(userBranchAccessSchema),
});

/** Response of `GET /users/:id/access`. */
export type UserAccessView = z.infer<typeof userAccessSchema>;

/** Wrong PINs or passwords in a row before the account locks (D-29). */
export const MAX_FAILED_ATTEMPTS = 5;
/** A locked super admin account unlocks by itself after this many minutes. */
export const SUPER_ADMIN_LOCK_MINUTES = 30;

/** Body of `POST /users/:id/reset-pin`: the new PIN is temporary (D-29). */
export const resetPinSchema = z.object({ pin: pinSchema });

/** Body of `POST /users/:id/reset-pin`. */
export type ResetPin = z.infer<typeof resetPinSchema>;

/** Body of `POST /auth/change-pin`: the caller changes their own PIN. */
export const changePinSchema = z
  .object({ currentPin: pinSchema, newPin: pinSchema })
  .refine((value) => value.currentPin !== value.newPin, {
    path: ['newPin'],
    error: 'The new PIN must differ from the current one',
  });

/** Body of `POST /auth/change-pin`. */
export type ChangePin = z.infer<typeof changePinSchema>;

/** Body of `POST /auth/change-password`: the super admin changes their own password. */
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    error: 'The new password must differ from the current one',
  });

/** Body of `POST /auth/change-password`. */
export type ChangePassword = z.infer<typeof changePasswordSchema>;
