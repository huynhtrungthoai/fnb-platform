import { z } from 'zod';

import { branchSummarySchema } from './branches.js';
import { localizedTextSchema } from './localized-text.js';
import { permissionCodeSchema, PERMISSION_MODULES, roleLimitsSchema } from './permissions/index.js';

/** A permission group as listed and edited in Admin (06 section 9). */
export const roleSchema = z.object({
  id: z.uuid(),
  /** Code of a default group, null for a custom one. */
  code: z.string().nullable(),
  name: localizedTextSchema,
  description: z.string().nullable(),
  /** Default group: cannot be deleted, can be restored to its defaults. */
  isSystem: z.boolean(),
  /** The owner group: every permission, never edited. */
  isLocked: z.boolean(),
  permissions: z.array(permissionCodeSchema),
  limits: roleLimitsSchema,
  version: z.number().int(),
  /** People assigned to the group, at any branch. */
  memberCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** A permission group. */
export type Role = z.infer<typeof roleSchema>;

const roleFields = {
  name: localizedTextSchema,
  description: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => (value === '' ? null : (value ?? null))),
  /** Codes the group holds; the API adds the ones they `require`. */
  permissions: z.array(permissionCodeSchema).max(500),
  limits: roleLimitsSchema,
};

/** Body of `POST /roles`: a custom group. */
export const createRoleSchema = z.object({ id: z.uuid().optional(), ...roleFields });

/** Body of `POST /roles`. */
export type CreateRole = z.infer<typeof createRoleSchema>;
/** Body of `POST /roles` before parsing. */
export type CreateRoleInput = z.input<typeof createRoleSchema>;

/** Body of `PATCH /roles/:id`. A default group keeps its code. */
export const updateRoleSchema = z.object(roleFields).partial();

/** Body of `PATCH /roles/:id`. */
export type UpdateRole = z.infer<typeof updateRoleSchema>;

/** Body of `POST /roles/:id/clone`: the copy's name; permissions and limits are copied. */
export const cloneRoleSchema = z.object({ id: z.uuid().optional(), name: localizedTextSchema });

/** Body of `POST /roles/:id/clone`. */
export type CloneRole = z.infer<typeof cloneRoleSchema>;

/** One permission of the catalog, for the tick screen. Names come from i18n `permissions`. */
export const permissionInfoSchema = z.object({
  code: permissionCodeSchema,
  module: z.enum(PERMISSION_MODULES as [string, ...string[]]),
  scope: z.enum(['branch', 'business']),
  isSensitive: z.boolean(),
  isApprovable: z.boolean(),
  requires: z.array(permissionCodeSchema),
  /** When this permission first reached the database; newer than a group's last edit means "New". */
  addedAt: z.iso.datetime(),
});

/** One permission of the catalog. */
export type PermissionInfo = z.infer<typeof permissionInfoSchema>;

/** A person in a group, as on the "members" tab. */
export const roleMemberSchema = z.object({
  userId: z.uuid(),
  fullName: z.string(),
  username: z.string(),
  isActive: z.boolean(),
  /** Null for the all-branches assignment. */
  branch: branchSummarySchema.nullable(),
});

/** A person in a group. */
export type RoleMember = z.infer<typeof roleMemberSchema>;
