import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { DangerButton } from './danger-button';
import { Dialog } from './dialog';
import { Input } from './input';

import type { IconName } from './icon';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Receives the reason when `reasonRequired` is set, otherwise an empty string. */
  onConfirm: (reason: string) => void;
  /** `danger` for actions that are hard to undo (docs/ui-rules.md section 5). */
  tone?: 'default' | 'danger';
  title: string;
  description?: string;
  confirmLabel: string;
  /** Icon of the danger button; required by `DangerButton`. */
  confirmIcon?: IconName;
  /** Asks for a reason before the action can run; its label is shown above the field. */
  reasonRequired?: boolean;
  reasonLabel?: string;
  /** The action is running: the buttons are blocked. */
  loading?: boolean;
}

/** Asks before an action runs. The danger tone fills its confirm button. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  tone = 'default',
  title,
  description,
  confirmLabel,
  confirmIcon = 'triangle-alert',
  reasonRequired = false,
  reasonLabel,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const isBlocked = reasonRequired && reason.trim().length === 0;

  const close = () => {
    setReason('');
    onClose();
  };
  const confirm = () => {
    onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      {...(description ? { description } : {})}
      size="sm"
      footer={
        <>
          <Button onClick={close} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          {tone === 'danger' ? (
            <DangerButton
              variant="solid"
              icon={confirmIcon}
              loading={loading}
              disabled={isBlocked}
              onClick={confirm}
            >
              {confirmLabel}
            </DangerButton>
          ) : (
            <Button variant="primary" loading={loading} disabled={isBlocked} onClick={confirm}>
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      {reasonRequired ? (
        <Input
          id={reasonId}
          label={reasonLabel ?? t('confirm.reason')}
          value={reason}
          onChange={setReason}
        />
      ) : null}
    </Dialog>
  );
}
