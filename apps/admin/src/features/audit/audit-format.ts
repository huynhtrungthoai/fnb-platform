import { AUDIT_ACTIONS } from '@fnb/contract';

import type { AuditAction, AuditLog } from '@fnb/contract';

/** True when the action is one the app has a label for. */
export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/** Entity prefixes offered as the "type" filter, `user.` matches every `user.*` action. */
export const AUDIT_GROUPS = [
  'auth',
  'user',
  'role',
  'branch',
  'device',
  'approval',
  'media',
] as const;

/** One of the "type" filter groups. */
export type AuditGroup = (typeof AUDIT_GROUPS)[number];

function readText(value: unknown, key: string): string | null {
  if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
    return null;
  }
  const field: unknown = (value as Record<string, unknown>)[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}

/** A readable name for the target of an event: a name in the recorded data, else a short id. */
export function describeTarget(row: AuditLog): string {
  for (const source of [row.after, row.before, row.metadata]) {
    for (const key of ['fullName', 'name', 'username', 'code']) {
      const text = readText(source, key);
      if (text) {
        return text;
      }
    }
    const localized =
      source !== null && typeof source === 'object' && Object.hasOwn(source, 'name')
        ? readText((source as Record<string, unknown>).name, 'vi')
        : null;
    if (localized) {
      return localized;
    }
  }
  return row.entityId ? `${row.entityType ?? ''} ${row.entityId.slice(0, 8)}`.trim() : '';
}

/** Changed top-level fields between the recorded before and after states. */
export function diffFields(row: AuditLog): { field: string; before: string; after: string }[] {
  const asRecord = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const before = asRecord(row.before);
  const after = asRecord(row.after);
  const show = (value: unknown) => (value === undefined ? '—' : JSON.stringify(value));
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => show(before[field]) !== show(after[field]))
    .map((field) => ({ field, before: show(before[field]), after: show(after[field]) }));
}
