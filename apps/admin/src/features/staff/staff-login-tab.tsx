import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUnlockUser } from '@fnb/api-client';
import { formatDateTime, resolveLocale } from '@fnb/i18n';
import { Button, Icon, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { ResetPinDialogs } from './reset-pin-dialogs';
import { UserStatusBadge } from './staff-badges';

import type { UserWithAssignments } from '@fnb/contract';
import type { ReactNode } from 'react';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-b-0">
      <dt className="text-text-muted text-sm">{label}</dt>
      <dd className="text-text text-sm">{children}</dd>
    </div>
  );
}

export interface StaffLoginTabProps {
  user: UserWithAssignments;
  /** `user.reset_credentials`, not the caller's own account. */
  canReset: boolean;
  isSelf: boolean;
}

/** Sign-in facts of an account; unlock and reset the PIN (CORE-14). */
export function StaffLoginTab({ user, canReset, isSelf }: StaffLoginTabProps) {
  const { t, i18n } = useTranslation('staff');
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const unlock = useUnlockUser();
  const [isResetOpen, setResetOpen] = useState(false);
  const isSuperAdmin = user.credentialType === 'password';

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col">
        <Row label={t('detail.loginStatus')}>
          <UserStatusBadge user={user} />
        </Row>
        <Row label={t('detail.credential')}>
          {isSuperAdmin ? t('detail.credentialPassword') : t('detail.credentialPin')}
        </Row>
        <Row label={t('detail.lastLogin')}>
          {user.lastLoginAt ? formatDateTime(user.lastLoginAt, locale) : t('never')}
        </Row>
        {user.lockedUntil ? (
          <Row label={t('status.locked')}>
            {t('detail.lockedUntil', { time: formatDateTime(user.lockedUntil, locale) })}
          </Row>
        ) : null}
      </dl>
      {isSelf ? (
        <p className="text-text-muted flex items-center gap-2 text-sm">
          <Icon name="info" size={16} />
          {t('detail.selfNote')}
        </p>
      ) : isSuperAdmin ? (
        <p className="text-text-muted flex items-center gap-2 text-sm">
          <Icon name="info" size={16} />
          {t('detail.superAdminNote')}
        </p>
      ) : canReset ? (
        <div className="flex flex-wrap gap-2">
          {user.isLocked ? (
            <Button
              icon="unlock"
              loading={unlock.isPending}
              onClick={() => {
                unlock.mutate(user.id, {
                  onSuccess: () => {
                    toast({
                      tone: 'success',
                      message: t('toast.unlocked', { name: user.fullName }),
                    });
                  },
                  onError: (error) => {
                    toast({ tone: 'danger', message: apiErrorMessage(error) });
                  },
                });
              }}
            >
              {t('actions.unlock')}
            </Button>
          ) : null}
          <Button
            icon="key"
            onClick={() => {
              setResetOpen(true);
            }}
          >
            {t('actions.resetPin')}
          </Button>
        </div>
      ) : null}
      <ResetPinDialogs
        user={isResetOpen ? user : null}
        onClose={() => {
          setResetOpen(false);
        }}
      />
    </div>
  );
}
