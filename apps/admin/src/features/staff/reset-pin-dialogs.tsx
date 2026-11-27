import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResetPin } from '@fnb/api-client';
import { Button, ConfirmDialog, Dialog, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { generateTempPin } from '../../lib/temp-pin';

import type { User } from '@fnb/contract';

/** Dialog that shows a temporary PIN once, to hand over to the person. */
export function TempPinDialog({
  name,
  pin,
  onClose,
}: {
  name: string;
  pin: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <Dialog
      open={pin !== null}
      onClose={onClose}
      title={t('tempPin.title', { name })}
      description={t('tempPin.description')}
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('tempPin.done')}
        </Button>
      }
    >
      <p className="text-text-muted text-sm">{t('tempPin.label')}</p>
      <p aria-live="polite" className="text-text text-xl font-bold tracking-widest tabular-nums">
        {pin ?? ''}
      </p>
    </Dialog>
  );
}

export interface ResetPinDialogsProps {
  /** The account to reset; null closes everything. */
  user: Pick<User, 'id' | 'fullName'> | null;
  onClose: () => void;
}

/**
 * Reset PIN (CORE-14): confirm, set a random temporary PIN through the API, then show it once.
 * The API unlocks the account and ends its sessions.
 */
export function ResetPinDialogs({ user, onClose }: ResetPinDialogsProps) {
  const { t } = useTranslation('staff');
  const apiErrorMessage = useApiErrorMessage();
  const resetPin = useResetPin();
  const [shownPin, setShownPin] = useState<string | null>(null);
  const name = user?.fullName ?? '';

  const confirm = () => {
    if (!user) {
      return;
    }
    const pin = generateTempPin();
    resetPin.mutate(
      { id: user.id, pin },
      {
        onSuccess: () => {
          setShownPin(pin);
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  };

  return (
    <>
      <ConfirmDialog
        open={user !== null && shownPin === null}
        onClose={onClose}
        onConfirm={confirm}
        title={t('resetPin.title', { name })}
        description={`${t('resetPin.description')} ${t('resetPin.note')}`}
        confirmLabel={t('actions.resetPin')}
        loading={resetPin.isPending}
      />
      <TempPinDialog
        name={name}
        pin={shownPin}
        onClose={() => {
          setShownPin(null);
          onClose();
        }}
      />
    </>
  );
}
