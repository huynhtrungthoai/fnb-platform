import { z } from 'zod';

import { branchSummarySchema } from './branches.js';
import { pinSchema } from './users.js';

/** Header carrying the long-lived token of a registered POS or KDS device (CORE-33). */
export const DEVICE_HEADER = 'x-device-token';

/** What a device is used for; also the letter of its code (`P`, `H`, `K`). */
export const deviceKindSchema = z.enum(['pos', 'handheld', 'kds']);

/** What a device is used for. */
export type DeviceKind = z.infer<typeof deviceKindSchema>;

/** A registered device (CORE-30, CORE-31). */
export const deviceSchema = z.object({
  id: z.uuid(),
  branch: branchSummarySchema,
  /** Prefix of the invoice numbers it issues offline, e.g. `Q1-P01`. Never reused. */
  code: z.string(),
  name: z.string(),
  kind: deviceKindSchema,
  isActive: z.boolean(),
  revokedAt: z.iso.datetime().nullable(),
  lastSeenAt: z.iso.datetime().nullable(),
  appVersion: z.string().nullable(),
  /** Staff member of the last session opened on it. */
  lastUser: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
});

/** A registered device. */
export type Device = z.infer<typeof deviceSchema>;

/** Body of `POST /devices`, sent by the POS while a manager is signed in on it. */
export const registerDeviceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: deviceKindSchema,
  appVersion: z.string().trim().max(30).optional(),
});

/** Body of `POST /devices`. */
export type RegisterDevice = z.infer<typeof registerDeviceSchema>;

/**
 * Response of `POST /devices`. The token and the secret are shown once: the device keeps them
 * in the platform key store; the secret also salts PIN hashes of the offline snapshot (06 7.3).
 */
export const registeredDeviceSchema = z.object({
  device: deviceSchema,
  deviceToken: z.string(),
  deviceSecret: z.string(),
});

/** Response of `POST /devices`. */
export type RegisteredDevice = z.infer<typeof registeredDeviceSchema>;

/** Query of `GET /devices`. */
export const deviceListQuerySchema = z.object({
  branchId: z.uuid().optional(),
  status: z.enum(['active', 'revoked', 'all']).default('active'),
});

/** Query of `GET /devices`. */
export type DeviceListQuery = z.infer<typeof deviceListQuerySchema>;

/** A person on the lock screen of a device: picked by name, then the PIN (D-22). */
export const deviceStaffSchema = z.object({
  userId: z.uuid(),
  fullName: z.string(),
  avatarMediaId: z.uuid().nullable(),
  isLocked: z.boolean(),
});

/** A person on the lock screen of a device. */
export type DeviceStaff = z.infer<typeof deviceStaffSchema>;

/** Body of `POST /devices/session`: opens a staff session on the device. */
export const deviceSessionSchema = z.object({
  userId: z.uuid(),
  pin: pinSchema,
});

/** Body of `POST /devices/session`. */
export type DeviceSessionInput = z.infer<typeof deviceSessionSchema>;
