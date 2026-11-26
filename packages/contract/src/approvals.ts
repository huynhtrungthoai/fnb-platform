import { z } from 'zod';

import { permissionCodeSchema } from './permissions/index.js';
import { pinSchema } from './users.js';

/** Header carrying an approval token on the action it approves (06 section 6). */
export const APPROVAL_HEADER = 'x-approval-token';

/** How long an approval stays usable, in seconds: enough to finish the action, never more. */
export const APPROVAL_TTL_SECONDS = 120;

/** Query of `GET /approvals/approvers`: who may approve this permission at the current branch. */
export const approversQuerySchema = z.object({ permission: permissionCodeSchema });

/** Query of `GET /approvals/approvers`. */
export type ApproversQuery = z.infer<typeof approversQuerySchema>;

/** A person who may approve, picked by name before typing the PIN (D-22). */
export const approverSchema = z.object({
  userId: z.uuid(),
  fullName: z.string(),
  avatarMediaId: z.uuid().nullable(),
});

/** A person who may approve. */
export type Approver = z.infer<typeof approverSchema>;

/** Body of `POST /approvals`: the approver types their PIN on the requester's screen. */
export const createApprovalSchema = z.object({
  permission: permissionCodeSchema,
  approverUserId: z.uuid(),
  pin: pinSchema,
  /** Required: the audit log keeps why the rule was bypassed. */
  reason: z.string().trim().min(1).max(200),
});

/** Body of `POST /approvals`. */
export type CreateApproval = z.infer<typeof createApprovalSchema>;

/** A granted approval: send `token` in `X-Approval-Token` with the action, once. */
export const approvalSchema = z.object({
  id: z.uuid(),
  token: z.string(),
  permission: permissionCodeSchema,
  approverUserId: z.uuid(),
  expiresAt: z.iso.datetime(),
});

/** A granted approval. */
export type Approval = z.infer<typeof approvalSchema>;
