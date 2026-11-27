import { useTranslation } from 'react-i18next';

import { localize, resolveLocale } from '@fnb/i18n';
import { Badge } from '@fnb/ui-web';

import type { User, UserAssignment } from '@fnb/contract';

/** Account status with an icon: locked, disabled, temporary PIN or active. */
export function UserStatusBadge({ user }: { user: User }) {
  const { t } = useTranslation('staff');
  if (!user.isActive) {
    return <Badge icon="ban">{t('status.disabled')}</Badge>;
  }
  if (user.isLocked) {
    return (
      <Badge tone="danger" icon="lock">
        {t('status.locked')}
      </Badge>
    );
  }
  if (user.mustChangePin) {
    return (
      <Badge tone="warning" icon="key">
        {t('status.mustChangePin')}
      </Badge>
    );
  }
  return (
    <Badge tone="success" icon="check">
      {t('status.active')}
    </Badge>
  );
}

/** "Branch · group" for each assignment; the all-branches one first. */
export function AssignmentBadges({
  assignments,
  isSuperAdmin,
}: {
  assignments: readonly UserAssignment[];
  isSuperAdmin: boolean;
}) {
  const { t, i18n } = useTranslation('staff');
  const locale = resolveLocale(i18n.language);
  const sorted = [...assignments].sort(
    (a, b) => Number(a.branch !== null) - Number(b.branch !== null),
  );
  if (sorted.length === 0 && !isSuperAdmin) {
    return <span className="text-text-subtle text-sm">{t('noAssignment')}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {sorted.map((assignment) => (
        <Badge
          key={assignment.branch?.id ?? 'all'}
          tone={assignment.branch ? 'neutral' : 'primary'}
        >
          {`${assignment.branch?.name ?? t('allBranches')} · ${localize(assignment.role.name, locale)}`}
        </Badge>
      ))}
      {isSuperAdmin ? <Badge tone="info">{t('status.superAdmin')}</Badge> : null}
    </span>
  );
}

/** Initials in a round chip, standing in for the photo (M1-15 adds photos later). */
export function UserAvatar({ fullName }: { fullName: string }) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="size-control-sm bg-bg-muted text-text-muted inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold"
    >
      {initials}
    </span>
  );
}
