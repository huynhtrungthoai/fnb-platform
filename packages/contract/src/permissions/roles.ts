import { z } from 'zod';

import { DEFAULT_ROLE_CODES } from './define.js';

import type { LocalizedText } from '../localized-text.js';
import type { DefaultRoleCode } from './define.js';

/** Schema of a default permission group code. */
export const defaultRoleCodeSchema = z.enum(DEFAULT_ROLE_CODES);

/**
 * Limits of a permission group (plans/06-permissions.md section 5). `null` means no limit.
 * A limit only matters when the group holds the permission it belongs to.
 */
export const roleLimitsSchema = z.object({
  /** Highest discount in percent; goes with `order.discount_item` and `order.discount_order`. */
  maxDiscountPercent: z.number().int().min(0).max(100).nullable(),
  /** Highest amount of one cash pay-out in VND; goes with `cash.pay_in_out`. */
  maxPayOutAmount: z.number().int().min(0).nullable(),
  /** Highest refund of one order in VND; goes with `order.refund`. */
  maxRefundAmount: z.number().int().min(0).nullable(),
});

/** Limits of a permission group. */
export type RoleLimits = z.infer<typeof roleLimitsSchema>;

/** Limits of a group that has none set. */
export const NO_LIMITS: RoleLimits = {
  maxDiscountPercent: null,
  maxPayOutAmount: null,
  maxRefundAmount: null,
};

/** A default permission group as installed. The owner edits everything but `owner` afterwards. */
export interface DefaultRole {
  code: DefaultRoleCode;
  name: LocalizedText & { en: string };
  description: string;
  /** Only `owner`: always holds every permission and cannot be edited. */
  isLocked: boolean;
  limits: RoleLimits;
}

/**
 * The seven default groups. Which permissions each one holds comes from `defaultRoles` of the
 * permission declarations. Names and limits follow plans/06-permissions.md sections 4 and 5;
 * they are installation values awaiting the owner's review (O-13), kept as data so they are easy to change.
 */
export const DEFAULT_ROLES: readonly DefaultRole[] = [
  {
    code: 'owner',
    name: { vi: 'Chủ', en: 'Owner' },
    description: 'Super admin account kept by the owner; holds every permission.',
    isLocked: true,
    limits: NO_LIMITS,
  },
  {
    code: 'manager',
    name: { vi: 'Quản lý chi nhánh', en: 'Branch manager' },
    description: 'Runs one branch: staff, devices, approvals, reports.',
    isLocked: false,
    limits: { maxDiscountPercent: 100, maxPayOutAmount: null, maxRefundAmount: null },
  },
  {
    code: 'cashier',
    name: { vi: 'Thu ngân', en: 'Cashier' },
    description: 'Sells and takes payment at the counter.',
    isLocked: false,
    limits: { maxDiscountPercent: 10, maxPayOutAmount: 200_000, maxRefundAmount: null },
  },
  {
    code: 'staff',
    name: { vi: 'Nhân viên', en: 'Staff' },
    description: 'Creates orders; does not take payment.',
    isLocked: false,
    limits: NO_LIMITS,
  },
  {
    code: 'kitchen',
    name: { vi: 'Bếp', en: 'Kitchen' },
    description: 'Works the kitchen display.',
    isLocked: false,
    limits: NO_LIMITS,
  },
  {
    code: 'stock_keeper',
    name: { vi: 'Thủ kho', en: 'Stock keeper' },
    description: 'Receives, issues and counts stock.',
    isLocked: false,
    limits: NO_LIMITS,
  },
  {
    code: 'accountant',
    name: { vi: 'Kế toán', en: 'Accountant' },
    description: 'Cash book, reconciliation and reports across branches.',
    isLocked: false,
    limits: NO_LIMITS,
  },
];
