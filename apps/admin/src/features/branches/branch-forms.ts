import { z } from 'zod';

import {
  bankAccountSchema,
  branchCodeSchema,
  percentSchema,
  timeOfDaySchema,
  timeZoneSchema,
} from '@fnb/contract';

import type { Branch, BranchSettings, UpdateBranch, UpdateBranchSettings } from '@fnb/contract';

/** A coordinate typed as text: empty means none. */
const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || Math.abs(Number(value)) <= limit, { error: 'coordinate' })
    .refine((value) => value === '' || Number.isFinite(Number(value)), { error: 'coordinate' })
    .transform((value) => (value === '' ? null : Number(value)));

/** A percentage typed as text. */
const percent = z
  .string()
  .trim()
  .refine((value) => value !== '' && percentSchema.safeParse(Number(value)).success, {
    error: 'percent',
  })
  .transform(Number);

/** Fields of the branch itself (CORE-01). */
export const branchInfoFormSchema = z.object({
  code: branchCodeSchema,
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(300),
  latitude: coordinate(90),
  longitude: coordinate(180),
});

export type BranchInfoFormInput = z.input<typeof branchInfoFormSchema>;
export type BranchInfoFormOutput = z.output<typeof branchInfoFormSchema>;

/** Form values from a branch. */
export function toBranchInfoForm(branch: Branch | undefined): BranchInfoFormInput {
  return {
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    phone: branch?.phone ?? '',
    address: branch?.address ?? '',
    latitude:
      branch?.latitude === null || branch?.latitude === undefined ? '' : String(branch.latitude),
    longitude:
      branch?.longitude === null || branch?.longitude === undefined ? '' : String(branch.longitude),
  };
}

/** Body of `PATCH /branches/:id`; empty text becomes null. */
export function toUpdateBranch(values: BranchInfoFormOutput): UpdateBranch {
  return {
    code: values.code,
    name: values.name,
    phone: values.phone === '' ? null : values.phone,
    address: values.address === '' ? null : values.address,
    latitude: values.latitude,
    longitude: values.longitude,
  };
}

/** Hours and tax of a branch (CORE-02). */
export const branchHoursFormSchema = z.object({
  timezone: timeZoneSchema,
  openTime: timeOfDaySchema,
  closeTime: timeOfDaySchema,
  dayCutoffTime: timeOfDaySchema,
  taxRatePercent: percent,
  serviceChargePercent: percent,
});

export type BranchHoursFormInput = z.input<typeof branchHoursFormSchema>;
export type BranchHoursFormOutput = z.output<typeof branchHoursFormSchema>;

/** Form values from the settings. A pending cutoff is shown as the value being set. */
export function toBranchHoursForm(settings: BranchSettings | undefined): BranchHoursFormInput {
  return {
    timezone: settings?.timezone ?? 'Asia/Ho_Chi_Minh',
    openTime: settings?.openTime ?? '10:00',
    closeTime: settings?.closeTime ?? '22:00',
    dayCutoffTime: settings?.pendingDayCutoffTime ?? settings?.dayCutoffTime ?? '00:00',
    taxRatePercent: String(settings?.taxRatePercent ?? 0),
    serviceChargePercent: String(settings?.serviceChargePercent ?? 0),
  };
}

/** Body of `PUT /branches/:id/settings` for the hours form. */
export function toUpdateHours(values: BranchHoursFormOutput): UpdateBranchSettings {
  return { ...values };
}

const optionalText = (max: number) => z.string().trim().max(max);

/** What the receipt prints and where QR transfers go. */
export const branchReceiptFormSchema = z
  .object({
    businessName: optionalText(120),
    address: optionalText(300),
    phone: optionalText(30),
    taxCode: optionalText(30),
    footer: optionalText(300),
    bankCode: z.string().trim(),
    accountNumber: z.string().trim(),
    accountName: z.string().trim(),
  })
  .superRefine((value, context) => {
    const bank = [value.bankCode, value.accountNumber, value.accountName];
    if (bank.every((part) => part === '')) {
      return;
    }
    const parsed = bankAccountSchema.safeParse({
      bankCode: value.bankCode,
      accountNumber: value.accountNumber,
      accountName: value.accountName,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          context.addIssue({ code: 'custom', path: [field], message: 'bankIncomplete' });
        }
      }
    }
  });

export type BranchReceiptFormValues = z.input<typeof branchReceiptFormSchema>;

/** Form values from the settings. */
export function toBranchReceiptForm(settings: BranchSettings | undefined): BranchReceiptFormValues {
  return {
    businessName: settings?.receipt.businessName ?? '',
    address: settings?.receipt.address ?? '',
    phone: settings?.receipt.phone ?? '',
    taxCode: settings?.receipt.taxCode ?? '',
    footer: settings?.receipt.footer ?? '',
    bankCode: settings?.bankAccount?.bankCode ?? '',
    accountNumber: settings?.bankAccount?.accountNumber ?? '',
    accountName: settings?.bankAccount?.accountName ?? '',
  };
}

/** Body of `PUT /branches/:id/settings` for the receipt form; no bank account when all empty. */
export function toUpdateReceipt(values: BranchReceiptFormValues): UpdateBranchSettings {
  const hasBank = [values.bankCode, values.accountNumber, values.accountName].some(
    (part) => part.trim() !== '',
  );
  return {
    receipt: {
      businessName: values.businessName,
      address: values.address,
      phone: values.phone,
      taxCode: values.taxCode,
      footer: values.footer,
    },
    bankAccount: hasBank
      ? {
          bankCode: values.bankCode.trim(),
          accountNumber: values.accountNumber.trim(),
          accountName: values.accountName.trim(),
        }
      : null,
  };
}
