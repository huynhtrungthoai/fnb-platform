import { useTranslation } from 'react-i18next';

import { formatMoney, resolveLocale } from '@fnb/i18n';

import type { Me, PermissionCode, PermissionInfo, Role, RoleLimits } from '@fnb/contract';

/** Formats the limits of a group as one short line, or null when it has none. */
export function useLimitsSummary(): (limits: RoleLimits) => string | null {
  const { t, i18n } = useTranslation('staff');
  const locale = resolveLocale(i18n.language);
  return (limits) => {
    const parts: string[] = [];
    if (limits.maxDiscountPercent !== null) {
      parts.push(t('limits.maxDiscountPercent', { value: limits.maxDiscountPercent }));
    }
    if (limits.maxPayOutAmount !== null) {
      parts.push(
        t('limits.maxPayOutAmount', { value: formatMoney(limits.maxPayOutAmount, locale) }),
      );
    }
    if (limits.maxRefundAmount !== null) {
      parts.push(
        t('limits.maxRefundAmount', { value: formatMoney(limits.maxRefundAmount, locale) }),
      );
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };
}

/** Every permission the caller holds anywhere: what they may grant (CORE-27). */
export function heldPermissions(me: Me | null | undefined): ReadonlySet<PermissionCode> {
  return new Set([
    ...(me?.businessPermissions ?? []),
    ...(me?.branches ?? []).flatMap((entry) => entry.permissions),
  ]);
}

/** The caller belongs to this group somewhere, so may not edit it (CORE-27). */
export function isOwnRole(me: Me | null | undefined, roleId: string): boolean {
  return (me?.branches ?? []).some((entry) => entry.role.id === roleId);
}

/** Permissions added to the catalog after the group was last edited (label "New", 06 section 9). */
export function newPermissions(
  catalog: readonly PermissionInfo[],
  role: Pick<Role, 'updatedAt' | 'isLocked'>,
): ReadonlySet<PermissionCode> {
  if (role.isLocked) {
    return new Set();
  }
  const edited = Date.parse(role.updatedAt);
  return new Set(
    catalog.filter((info) => Date.parse(info.addedAt) > edited).map((info) => info.code),
  );
}
