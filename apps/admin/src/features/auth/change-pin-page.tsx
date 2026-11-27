import { useTranslation } from 'react-i18next';

import { useLogout, useMe } from '@fnb/api-client';
import { Button, Skeleton, toast } from '@fnb/ui-web';

import { AuthLayout } from './auth-layout';
import { ChangeSecretForm } from './change-secret-form';

export interface ChangePinPageProps {
  /** Back to the Admin once the PIN or password is changed, or on cancel. */
  onDone: () => void;
  /** After signing out from a forced change. */
  onSignedOut: () => void;
}

/**
 * Change one's own PIN, or the super admin's password. Also the forced screen after signing in
 * with a temporary PIN (D-29): then cancel is replaced by sign out.
 */
export function ChangePinPage({ onDone, onSignedOut }: ChangePinPageProps) {
  const { t } = useTranslation(['admin', 'common']);
  const me = useMe();
  const logout = useLogout();
  const user = me.data?.user;
  const isForced = user?.mustChangePin ?? false;
  const isPin = (user?.credentialType ?? 'pin') === 'pin';

  return (
    <AuthLayout
      title={isPin ? t('changePin.titlePin') : t('changePin.titlePassword')}
      description={isForced ? t('changePin.forcedDescription') : t('changePin.description')}
    >
      {user ? (
        <ChangeSecretForm
          credentialType={user.credentialType}
          onDone={() => {
            toast({ tone: 'success', message: t('changePin.done') });
            onDone();
          }}
          secondary={
            isForced ? (
              <Button
                variant="ghost"
                loading={logout.isPending}
                onClick={() => {
                  logout.mutate(undefined, { onSettled: onSignedOut });
                }}
              >
                {t('shell.logout')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={onDone}>
                {t('common:actions.cancel')}
              </Button>
            )
          }
        />
      ) : (
        <Skeleton shape="rect" />
      )}
    </AuthLayout>
  );
}
