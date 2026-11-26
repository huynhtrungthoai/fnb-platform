import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { isUniqueViolation } from '../../db/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session/session.service.js';
import { BranchesService } from '../branches/branches.service.js';
import {
  branchReach,
  hasPermissionAt,
  reachesBranch,
  resolveEffectiveAccess,
} from '../rbac/access.js';
import { permissionDenied, RbacService } from '../rbac/rbac.service.js';
import { UserCredentialsService } from '../users/user-credentials.service.js';
import { isLockedNow, UsersService } from '../users/users.service.js';
import { DevicesRepository } from './devices.repository.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { DeviceRow } from './devices.repository.js';
import type {
  AuthTokens,
  BranchSummary,
  Device,
  DeviceKind,
  DeviceListQuery,
  DeviceSessionInput,
  DeviceStaff,
  RegisterDevice,
  RegisteredDevice,
} from '@fnb/contract';

const KIND_LETTER: Record<DeviceKind, string> = { pos: 'P', handheld: 'H', kds: 'K' };
const CODE_ATTEMPTS = 5;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** The next free code for a branch and kind: `Q1-P01`, `Q1-P02`… Codes of revoked devices stay taken. */
export function nextDeviceCode(
  branchCode: string,
  kind: DeviceKind,
  taken: readonly string[],
): string {
  const prefix = `${branchCode}-${KIND_LETTER[kind]}`;
  const numbers = taken
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number.parseInt(code.slice(prefix.length), 10))
    .filter((value) => Number.isInteger(value));
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}${String(next).padStart(2, '0')}`;
}

/**
 * POS and KDS devices (CORE-30, CORE-31, CORE-33). A manager signs in on the device once to
 * register it; the device then holds a long-lived token, and staff open short sessions on it by
 * picking their name and typing their PIN.
 */
@Injectable()
export class DevicesService {
  constructor(
    private readonly repository: DevicesRepository,
    private readonly branches: BranchesService,
    private readonly rbac: RbacService,
    private readonly users: UsersService,
    private readonly credentials: UserCredentialsService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  /** Registers the device the caller is signed in on, at the branch of the request. */
  async register(
    caller: AuthContext,
    branchId: string,
    input: RegisterDevice,
  ): Promise<RegisteredDevice> {
    await this.branches.assertActive(branchId);
    const branch = await this.branches.getById(branchId);
    const deviceToken = randomBytes(32).toString('base64url');
    const deviceSecret = randomBytes(32).toString('base64url');
    let row: DeviceRow | undefined;
    for (let attempt = 0; attempt < CODE_ATTEMPTS && !row; attempt += 1) {
      const prefix = `${branch.code}-${KIND_LETTER[input.kind]}`;
      const code = nextDeviceCode(
        branch.code,
        input.kind,
        await this.repository.codesWithPrefix(prefix),
      );
      try {
        row = await this.repository.insert({
          branchId,
          code,
          name: input.name,
          kind: input.kind,
          tokenHash: hashToken(deviceToken),
          secretKey: deviceSecret,
          appVersion: input.appVersion ?? null,
          createdBy: caller.userId,
        });
      } catch (error) {
        // Two devices registered at the same moment: take the next number.
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
    if (!row) {
      throw new AppError('CONFLICT', 'Could not allocate a device code');
    }
    const device = await this.toDevice(row);
    this.audit.describe({ entityType: 'device', entityId: row.id, after: device, branchId });
    return { device, deviceToken, deviceSecret };
  }

  /** Devices at the branches where the caller holds `device.manage`. */
  async list(caller: AuthContext, query: DeviceListQuery): Promise<Device[]> {
    const reach = branchReach(caller.access, 'device.manage');
    const branchIds = (await this.branches.allSummaries())
      .map((branch) => branch.id)
      .filter((id) => reachesBranch(reach, id))
      .filter((id) => !query.branchId || id === query.branchId);
    const rows = await this.repository.list({ branchIds, status: query.status });
    return this.toDevices(rows);
  }

  /** Revokes a device: its token stops working and every session on it ends at once. */
  async revoke(caller: AuthContext, id: string): Promise<Device> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw notFound('device', id);
    }
    if (!hasPermissionAt(caller.access, 'device.manage', row.branchId)) {
      throw permissionDenied('device.manage');
    }
    const updated =
      row.revokedAt === null
        ? ((await this.repository.update(id, {
            revokedAt: new Date(),
            revokedBy: caller.userId,
          })) ?? row)
        : row;
    await this.sessions.endAllOfDevice(id);
    const device = await this.toDevice(updated);
    this.audit.describe({
      entityType: 'device',
      entityId: id,
      before: { isActive: row.revokedAt === null },
      after: { isActive: false },
      branchId: row.branchId,
    });
    return device;
  }

  /** The device behind a token; `401 DEVICE_INVALID` or `DEVICE_REVOKED` otherwise. */
  async authenticate(token: string | undefined): Promise<DeviceRow> {
    const row = token ? await this.repository.findByTokenHash(hashToken(token)) : undefined;
    if (!row) {
      throw new AppError('DEVICE_INVALID', 'Unknown device token');
    }
    if (row.revokedAt !== null) {
      throw new AppError('DEVICE_REVOKED', 'Device has been revoked');
    }
    return row;
  }

  /** Branch of an active device, for the access guard; throws when it was revoked. */
  async requireActiveBranch(deviceId: string): Promise<string> {
    const row = await this.repository.findById(deviceId);
    if (row?.revokedAt !== null) {
      throw new AppError('DEVICE_REVOKED', 'Device has been revoked');
    }
    return row.branchId;
  }

  /** Who can open a session on the device: active people assigned at its branch. */
  async staff(device: DeviceRow): Promise<DeviceStaff[]> {
    const assignments = await this.rbac.listAssignments();
    const userIds = [
      ...new Set(
        assignments
          .filter((row) => row.branchId === device.branchId || row.branchId === null)
          .map((row) => row.userId),
      ),
    ];
    const now = new Date();
    await this.repository.update(device.id, { lastSeenAt: now });
    return (await this.users.findRows(userIds))
      .filter((row) => row.isActive)
      .map((row) => ({
        userId: row.id,
        fullName: row.fullName,
        avatarMediaId: row.avatarMediaId,
        isLocked: isLockedNow(row, now),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }

  /** Opens a staff session on the device with the person's PIN (CORE-13, D-22). */
  async openSession(device: DeviceRow, input: DeviceSessionInput): Promise<AuthTokens> {
    const user = await this.users.findRow(input.userId);
    const access = user ? await this.rbac.getUserAccess(user.id) : null;
    if (!user || !access || !resolveEffectiveAccess(access, device.branchId)) {
      throw new AppError('PERMISSION_DENIED', 'Not assigned at the branch of this device');
    }
    // Even the super admin uses the PIN on a device; the password is only for Admin.
    const check = await this.credentials.checkSecret(user, input.pin, 'pin');
    if (!check.isValid) {
      throw check.isLocked
        ? new AppError('ACCOUNT_LOCKED', 'Account locked after too many wrong attempts')
        : new AppError('INVALID_CREDENTIALS', 'Wrong PIN');
    }
    if (!user.isActive) {
      throw new AppError('ACCOUNT_DISABLED', 'Account is disabled');
    }
    const now = new Date();
    await this.repository.update(device.id, { lastSeenAt: now, lastUserId: user.id });
    await this.users.recordLogin(user.id, now);
    const tokens = await this.sessions.start(
      { userId: user.id, deviceId: device.id, mustChangePin: user.mustChangePin },
      now,
    );
    await this.audit.record({
      action: 'device.session_open',
      actorUserId: user.id,
      deviceId: device.id,
      branchId: device.branchId,
      entityType: 'device',
      entityId: device.id,
    });
    return tokens;
  }

  private async toDevice(row: DeviceRow): Promise<Device> {
    const [device] = await this.toDevices([row]);
    if (!device) {
      throw notFound('device', row.id);
    }
    return device;
  }

  private async toDevices(rows: readonly DeviceRow[]): Promise<Device[]> {
    const branchIds = [...new Set(rows.map((row) => row.branchId))];
    const userIds = [...new Set(rows.flatMap((row) => (row.lastUserId ? [row.lastUserId] : [])))];
    const [branches, users] = await Promise.all([
      this.branches.summariesByIds(branchIds),
      this.users.findRows(userIds),
    ]);
    const branchById = new Map<string, BranchSummary>(
      branches.map((branch) => [branch.id, branch]),
    );
    const userById = new Map(users.map((user) => [user.id, user]));
    return rows.flatMap((row) => {
      const branch = branchById.get(row.branchId);
      if (!branch) {
        return [];
      }
      const lastUser = row.lastUserId ? userById.get(row.lastUserId) : undefined;
      return [
        {
          id: row.id,
          branch,
          code: row.code,
          name: row.name,
          kind: row.kind,
          isActive: row.revokedAt === null,
          revokedAt: row.revokedAt?.toISOString() ?? null,
          lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
          appVersion: row.appVersion,
          lastUser: lastUser ? { id: lastUser.id, fullName: lastUser.fullName } : null,
          createdAt: row.createdAt.toISOString(),
        },
      ];
    });
  }
}
