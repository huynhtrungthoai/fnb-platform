import { Injectable } from '@nestjs/common';

import { DEFAULT_DAY_CUTOFF, DEFAULT_TIME_ZONE, getBusinessDate } from '@fnb/utils';

import { AppError, notFound } from '../../common/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { BranchesRepository } from './branches.repository.js';

import type { BranchReach } from '../rbac/access.js';
import type { BranchRow, BranchSettingsRow } from './branches.repository.js';
import type {
  Branch,
  BranchSettings,
  BranchSummary,
  CreateBranch,
  UpdateBranch,
  UpdateBranchSettings,
} from '@fnb/contract';

/** Settings of a new branch (CORE-02, D-28, D-36). */
export const DEFAULT_BRANCH_SETTINGS = {
  timezone: DEFAULT_TIME_ZONE,
  openTime: '10:00',
  closeTime: '22:00',
  dayCutoffTime: DEFAULT_DAY_CUTOFF,
  taxRateBps: 0,
  serviceChargeBps: 0,
  receipt: { businessName: null, address: null, phone: null, taxCode: null, footer: null },
  bankAccount: null,
} as const;

const DAY_MS = 86_400_000;
const POSTGRES_UNIQUE_VIOLATION = '23505';

const toBps = (percent: number): number => Math.round(percent * 100);
const toPercent = (bps: number): number => bps / 100;

/** The calendar day after an ISO date. */
export function nextIsoDate(isoDate: string): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, error instanceof Error ? error.cause : undefined];
  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === POSTGRES_UNIQUE_VIOLATION,
  );
}

/** Converts a branch row to the response shape. */
export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Converts a settings row to the response shape. */
export function toBranchSettings(row: BranchSettingsRow): BranchSettings {
  return {
    branchId: row.branchId,
    timezone: row.timezone,
    openTime: row.openTime,
    closeTime: row.closeTime,
    dayCutoffTime: row.dayCutoffTime,
    pendingDayCutoffTime: row.pendingDayCutoffTime,
    pendingDayCutoffFrom: row.pendingDayCutoffFrom,
    taxRatePercent: toPercent(row.taxRateBps),
    serviceChargePercent: toPercent(row.serviceChargeBps),
    receipt: row.receipt,
    bankAccount: row.bankAccount ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Branches and their settings (CORE-01, CORE-02). Other modules read branch data through this
 * service; they never query the tables.
 */
@Injectable()
export class BranchesService {
  constructor(
    private readonly repository: BranchesRepository,
    private readonly audit: AuditService,
  ) {}

  /** Branches the caller may see through `branch.view`. */
  async list(reach: BranchReach, isActiveOnly = false): Promise<Branch[]> {
    return (await this.repository.list({ reach, isActiveOnly })).map(toBranch);
  }

  /** Short facts of the given branches, for the branch picker of any signed-in user. */
  async summariesByIds(ids: readonly string[]): Promise<BranchSummary[]> {
    return (await this.repository.findByIds(ids)).map(toSummary);
  }

  /** Short facts of every branch, for callers assigned to all branches. */
  async allSummaries(): Promise<BranchSummary[]> {
    return (await this.repository.list()).map(toSummary);
  }

  async getById(id: string): Promise<Branch> {
    return toBranch(await this.requireRow(id));
  }

  /** True when the branch exists. */
  async exists(id: string): Promise<boolean> {
    return (await this.repository.findById(id)) !== undefined;
  }

  /** Throws unless the branch exists and is active. New orders and devices need an active branch. */
  async assertActive(id: string): Promise<void> {
    const row = await this.requireRow(id);
    if (!row.isActive) {
      throw new AppError('BRANCH_INACTIVE', `Branch ${row.code} is inactive`, {
        params: { code: row.code },
      });
    }
  }

  async create(input: CreateBranch, createdBy: string): Promise<Branch> {
    let row: BranchRow;
    try {
      row = await this.repository.insert(
        {
          ...(input.id ? { id: input.id } : {}),
          code: input.code,
          name: input.name,
          address: input.address,
          phone: input.phone,
          latitude: input.latitude,
          longitude: input.longitude,
          createdBy,
        },
        DEFAULT_BRANCH_SETTINGS,
      );
    } catch (error) {
      throw this.translateConflict(error, input.code);
    }
    const branch = toBranch(row);
    // Branches are business-level data: the log row belongs to no branch.
    this.audit.describe({ entityType: 'branch', entityId: row.id, after: branch, branchId: null });
    return branch;
  }

  async update(id: string, input: UpdateBranch): Promise<Branch> {
    const before = await this.requireRow(id);
    // TODO(M3-08): refuse a code change once the branch has invoices (plans/10-foundation.md).
    let row: BranchRow | undefined;
    try {
      row = await this.repository.update(id, input);
    } catch (error) {
      throw this.translateConflict(error, input.code ?? before.code);
    }
    const branch = toBranch(row ?? before);
    this.audit.describe({
      entityType: 'branch',
      entityId: id,
      before: toBranch(before),
      after: branch,
      branchId: null,
    });
    return branch;
  }

  /** Activates or deactivates a branch. A deactivated branch keeps its data (CORE-01). */
  async setActive(id: string, isActive: boolean): Promise<Branch> {
    const before = await this.requireRow(id);
    const row =
      before.isActive === isActive ? before : await this.repository.update(id, { isActive });
    const branch = toBranch(row ?? before);
    this.audit.describe({
      entityType: 'branch',
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive: branch.isActive },
      branchId: null,
    });
    return branch;
  }

  /**
   * Settings of a branch. A pending cutoff is applied here once its business day has started,
   * so every reader sees the cutoff that is really in force.
   */
  async getSettings(branchId: string, now: Date = new Date()): Promise<BranchSettings> {
    await this.requireRow(branchId);
    return toBranchSettings(await this.requireSettings(branchId, now));
  }

  async updateSettings(
    branchId: string,
    input: UpdateBranchSettings,
    now: Date = new Date(),
  ): Promise<BranchSettings> {
    await this.requireRow(branchId);
    const before = await this.requireSettings(branchId, now);
    const { dayCutoffTime, taxRatePercent, serviceChargePercent, receipt, ...rest } = input;
    const timezone = input.timezone ?? before.timezone;

    const values: Parameters<BranchesRepository['updateSettings']>[1] = { ...rest };
    if (taxRatePercent !== undefined) {
      values.taxRateBps = toBps(taxRatePercent);
    }
    if (serviceChargePercent !== undefined) {
      values.serviceChargeBps = toBps(serviceChargePercent);
    }
    if (receipt !== undefined) {
      values.receipt = receipt;
    }
    if (dayCutoffTime !== undefined) {
      if (dayCutoffTime === before.dayCutoffTime) {
        // Back to the cutoff in force: drop whatever change was waiting.
        values.pendingDayCutoffTime = null;
        values.pendingDayCutoffFrom = null;
      } else {
        // The current business day keeps its cutoff; the new one starts with the next day.
        values.pendingDayCutoffTime = dayCutoffTime;
        values.pendingDayCutoffFrom = nextIsoDate(
          getBusinessDate(now, timezone, before.dayCutoffTime),
        );
      }
    }

    const row = (await this.repository.updateSettings(branchId, values)) ?? before;
    const settings = toBranchSettings(row);
    this.audit.describe({
      entityType: 'branch_settings',
      entityId: branchId,
      before: toBranchSettings(before),
      after: settings,
      branchId,
    });
    return settings;
  }

  private async requireRow(id: string): Promise<BranchRow> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw notFound('branch', id);
    }
    return row;
  }

  private async requireSettings(branchId: string, now: Date): Promise<BranchSettingsRow> {
    const row = await this.repository.findSettings(branchId);
    if (!row) {
      throw notFound('branch_settings', branchId);
    }
    const isDue =
      row.pendingDayCutoffTime !== null &&
      row.pendingDayCutoffFrom !== null &&
      getBusinessDate(now, row.timezone, row.dayCutoffTime) >= row.pendingDayCutoffFrom;
    if (!isDue) {
      return row;
    }
    const promoted = await this.repository.updateSettings(branchId, {
      dayCutoffTime: row.pendingDayCutoffTime ?? row.dayCutoffTime,
      pendingDayCutoffTime: null,
      pendingDayCutoffFrom: null,
    });
    return promoted ?? row;
  }

  private translateConflict(error: unknown, code: string): unknown {
    return isUniqueViolation(error)
      ? new AppError('BRANCH_CODE_TAKEN', `Branch code ${code} is taken`, { params: { code } })
      : error;
  }
}

function toSummary(row: BranchRow): BranchSummary {
  return { id: row.id, code: row.code, name: row.name, isActive: row.isActive };
}
