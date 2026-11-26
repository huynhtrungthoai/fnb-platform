import { z } from 'zod';

/** Wall-clock time `HH:mm`, 24-hour. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Calendar date `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date();

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** IANA time zone name, for example `Asia/Ho_Chi_Minh`. */
export const timeZoneSchema = z.string().min(1).max(64).refine(isTimeZone);

/**
 * Branch code (CORE-01): prefix of invoice numbers such as `Q1-P02-000123`.
 * Two to six upper-case letters or digits; lower-case input is upper-cased.
 */
export const branchCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,6}$/);

/** An empty or missing text becomes null: `??` does not treat an empty string as missing. */
const blankToNull = (value: string | null | undefined): string | null => {
  const text = value ?? '';
  return text.length > 0 ? text : null;
};

const optionalText = (max: number) => z.string().trim().max(max).nullish().transform(blankToNull);

/** A percentage with at most two decimals, 0 to 100. Stored as basis points. */
export const percentSchema = z
  .number()
  .min(0)
  .max(100)
  .refine((value) => Number.isInteger(Math.round(value * 100 * 1e6) / 1e6));

/** A branch (CORE-01). The name is a proper name, not translated (40 section 4.2). */
export const branchSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  /** An inactive branch takes no new orders; its history stays readable. */
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** A branch. */
export type Branch = z.infer<typeof branchSchema>;

/** The few fields of a branch every signed-in user may see (branch picker). */
export const branchSummarySchema = branchSchema.pick({
  id: true,
  code: true,
  name: true,
  isActive: true,
});

/** The few fields of a branch every signed-in user may see. */
export type BranchSummary = z.infer<typeof branchSummarySchema>;

const branchFields = {
  code: branchCodeSchema,
  name: z.string().trim().min(1).max(120),
  address: optionalText(300),
  phone: optionalText(30),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullish()
    .transform((value) => value ?? null),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullish()
    .transform((value) => value ?? null),
};

/** Body of `POST /branches`. The client may send its own UUID v7. */
export const createBranchSchema = z.object({ id: z.uuid().optional(), ...branchFields });

/** Body of `POST /branches`. */
export type CreateBranch = z.infer<typeof createBranchSchema>;
/** Body of `POST /branches` before parsing (optional fields may be left out). */
export type CreateBranchInput = z.input<typeof createBranchSchema>;

/** Body of `PATCH /branches/:id`: only the fields sent are changed. */
export const updateBranchSchema = z
  .object({
    code: branchFields.code,
    name: branchFields.name,
    address: z.string().trim().max(300).nullable().transform(blankToNull),
    phone: z.string().trim().max(30).nullable().transform(blankToNull),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .partial();

/** Body of `PATCH /branches/:id`. */
export type UpdateBranch = z.infer<typeof updateBranchSchema>;

/** What is printed at the top and bottom of a receipt. */
export const receiptInfoSchema = z.object({
  businessName: optionalText(120),
  address: optionalText(300),
  phone: optionalText(30),
  taxCode: optionalText(30),
  footer: optionalText(300),
});

/** Bank account that receives QR transfers of the branch. */
export const bankAccountSchema = z.object({
  bankCode: z.string().trim().min(2).max(20),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{4,30}$/),
  accountName: z.string().trim().min(1).max(120),
});

const settingsFields = {
  timezone: timeZoneSchema,
  openTime: timeOfDaySchema,
  closeTime: timeOfDaySchema,
  /** Start of the business day; reports group by it (D-36). */
  dayCutoffTime: timeOfDaySchema,
  /** Default 0: prices already include tax (D-28). */
  taxRatePercent: percentSchema,
  serviceChargePercent: percentSchema,
  receipt: receiptInfoSchema,
  bankAccount: bankAccountSchema.nullable(),
};

/** Settings of one branch (CORE-02). */
export const branchSettingsSchema = z.object({
  branchId: z.uuid(),
  ...settingsFields,
  receipt: z.object({
    businessName: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    taxCode: z.string().nullable(),
    footer: z.string().nullable(),
  }),
  /**
   * A changed cutoff only applies from the next business day, so today's orders keep their
   * date. Until then the new value waits here.
   */
  pendingDayCutoffTime: timeOfDaySchema.nullable(),
  pendingDayCutoffFrom: isoDateSchema.nullable(),
  updatedAt: z.iso.datetime(),
});

/** Settings of one branch. */
export type BranchSettings = z.infer<typeof branchSettingsSchema>;

/** Body of `PUT /branches/:id/settings`: only the fields sent are changed. */
export const updateBranchSettingsSchema = z.object(settingsFields).partial();

/** Body of `PUT /branches/:id/settings`. */
export type UpdateBranchSettings = z.infer<typeof updateBranchSettingsSchema>;

/** Query of `GET /branches`. */
export const branchListQuerySchema = z.object({
  /** `all` includes inactive branches. */
  status: z.enum(['active', 'all']).default('all'),
});

/** Query of `GET /branches`. */
export type BranchListQuery = z.infer<typeof branchListQuerySchema>;
