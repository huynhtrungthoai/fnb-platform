import { Injectable } from '@nestjs/common';

import {
  DEFAULT_ROLES,
  defaultPermissionsOf,
  PERMISSION_CODES,
  PERMISSION_LIST,
  withRequiredPermissions,
} from '@fnb/contract';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { grantablePermissions, missingPermissions, toPermissionCodes } from './access.js';
import { RbacRepository } from './rbac.repository.js';
import { RbacService, roleEscalation } from './rbac.service.js';
import { RolesRepository } from './roles.repository.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type { RoleRecord } from './roles.repository.js';
import type {
  CloneRole,
  CreateRole,
  DefaultRoleCode,
  PermissionCode,
  PermissionInfo,
  Role,
  UpdateRole,
} from '@fnb/contract';

const isDefaultRoleCode = (code: string | null): code is DefaultRoleCode =>
  DEFAULT_ROLES.some((role) => role.code === code);

/**
 * Permission groups (CORE-22, CORE-25 → CORE-28, 06 section 8): custom groups, cloning, editing
 * default groups and restoring them, limits. Every change takes effect at once: the cache of the
 * group's members is dropped and their clients hear `permissions.changed`.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /** The permission catalog for the tick screen. */
  async catalog(): Promise<PermissionInfo[]> {
    const addedAt = new Map(
      (await this.roles.listPermissions()).map((row) => [row.code, row.createdAt.toISOString()]),
    );
    return PERMISSION_LIST.map((permission) => ({
      code: permission.code,
      module: permission.module,
      scope: permission.scope,
      isSensitive: permission.isSensitive,
      isApprovable: permission.isApprovable,
      requires: [...permission.requires],
      addedAt: addedAt.get(permission.code) ?? new Date(0).toISOString(),
    }));
  }

  async list(): Promise<Role[]> {
    const rows = await this.roles.list();
    const [codes, counts] = await Promise.all([
      this.rbacRepository.findPermissionCodes(rows.map((row) => row.id)),
      this.roles.memberCounts(),
    ]);
    return rows.map((row) => toRole(row, codes.get(row.id) ?? [], counts.get(row.id) ?? 0));
  }

  async getById(id: string): Promise<Role> {
    const row = await this.requireRow(id);
    const [codes, counts] = await Promise.all([
      this.rbacRepository.findPermissionCodes([id]),
      this.roles.memberCounts(),
    ]);
    return toRole(row, codes.get(id) ?? [], counts.get(id) ?? 0);
  }

  async create(caller: AuthContext, input: CreateRole): Promise<Role> {
    const permissions = withRequiredPermissions(input.permissions);
    this.assertHolds(caller, permissions);
    const row = await this.roles.transaction(async (tx) => {
      const inserted = await this.roles.insert(
        {
          ...(input.id ? { id: input.id } : {}),
          name: input.name,
          description: input.description,
          limits: input.limits,
          createdBy: caller.userId,
        },
        tx,
      );
      await this.roles.setPermissions(inserted.id, permissions, tx);
      return inserted;
    });
    const role = await this.getById(row.id);
    this.audit.describe({ entityType: 'role', entityId: row.id, after: role, branchId: null });
    return role;
  }

  /** A custom copy of any group, the owner group included (06 section 8, "Nhân bản"). */
  async clone(caller: AuthContext, id: string, input: CloneRole): Promise<Role> {
    const source = await this.getById(id);
    return this.create(caller, {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      description: source.description,
      permissions: source.permissions,
      limits: source.limits,
    });
  }

  async update(caller: AuthContext, id: string, input: UpdateRole): Promise<Role> {
    const before = await this.requireEditable(caller, id);
    const permissions =
      input.permissions === undefined ? undefined : withRequiredPermissions(input.permissions);
    if (permissions) {
      // Only what is being added must be held: removing a permission is never an escalation.
      this.assertHolds(caller, missingPermissions(before.permissions, permissions));
    }
    await this.roles.transaction(async (tx) => {
      await this.roles.update(
        id,
        {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.limits ? { limits: input.limits } : {}),
        },
        tx,
      );
      if (permissions) {
        await this.roles.setPermissions(id, permissions, tx);
      }
    });
    return this.afterChange(id, before);
  }

  /** Puts a default group back to its installation permissions, limits and names. */
  async restoreDefault(caller: AuthContext, id: string): Promise<Role> {
    const before = await this.requireEditable(caller, id);
    const definition = DEFAULT_ROLES.find((role) => role.code === before.code);
    if (!before.isSystem || !definition || !isDefaultRoleCode(before.code)) {
      throw new AppError('ROLE_NOT_SYSTEM', 'Only default groups have defaults to restore');
    }
    const permissions = defaultPermissionsOf(definition.code);
    this.assertHolds(caller, missingPermissions(before.permissions, permissions));
    await this.roles.transaction(async (tx) => {
      await this.roles.update(
        id,
        { name: definition.name, description: definition.description, limits: definition.limits },
        tx,
      );
      await this.roles.setPermissions(id, permissions, tx);
    });
    return this.afterChange(id, before);
  }

  /** Deletes a custom group nobody belongs to any more. */
  async delete(caller: AuthContext, id: string): Promise<void> {
    const before = await this.requireEditable(caller, id);
    if (before.isSystem) {
      throw new AppError('ROLE_IS_SYSTEM', 'Default groups cannot be deleted');
    }
    if (before.memberCount > 0) {
      throw new AppError('ROLE_IN_USE', 'Group still has members', {
        params: { count: before.memberCount },
      });
    }
    await this.roles.delete(id);
    this.audit.describe({ entityType: 'role', entityId: id, before, after: null, branchId: null });
  }

  private async afterChange(id: string, before: Role): Promise<Role> {
    await this.rbac.invalidateRole(id);
    const after = await this.getById(id);
    this.audit.describe({ entityType: 'role', entityId: id, before, after, branchId: null });
    return after;
  }

  /**
   * A group the caller may change: not the owner group, and not one the caller belongs to
   * ("không sửa nhóm của chính mình", 06 section 8).
   */
  private async requireEditable(caller: AuthContext, id: string): Promise<Role> {
    const role = await this.getById(id);
    if (role.isLocked) {
      throw new AppError('ROLE_LOCKED', 'The owner group cannot be changed');
    }
    const ownRoleIds = [
      caller.access.allBranches?.roleId,
      ...Object.values(caller.access.branches).map((grant) => grant.roleId),
    ];
    if (ownRoleIds.includes(id)) {
      throw new AppError('CANNOT_MODIFY_SELF', 'Callers cannot change a group they belong to');
    }
    return role;
  }

  /** Throws `ROLE_ESCALATION` unless the caller holds every one of these permissions business-wide. */
  private assertHolds(caller: AuthContext, permissions: readonly PermissionCode[]): void {
    const missing = missingPermissions(grantablePermissions(caller.access, null), permissions);
    if (missing.length > 0) {
      throw roleEscalation(missing);
    }
  }

  private async requireRow(id: string): Promise<RoleRecord> {
    const row = await this.roles.findById(id);
    if (!row) {
      throw notFound('role', id);
    }
    return row;
  }
}

function toRole(row: RoleRecord, codes: readonly string[], memberCount: number): Role {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    isLocked: row.isLocked,
    // The owner group holds every permission, including ones a later release adds.
    permissions: row.isLocked ? [...PERMISSION_CODES] : toPermissionCodes(codes),
    limits: row.limits,
    version: row.version,
    memberCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
