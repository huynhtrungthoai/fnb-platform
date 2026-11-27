import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCloneRole } from '@fnb/api-client';
import { localize, resolveLocale } from '@fnb/i18n';
import { Button, Dialog, LocalizedInput, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';

import type { LocalizedText, Role } from '@fnb/contract';

export interface CloneRoleDialogProps {
  /** The group to copy; null closes the dialog. */
  role: Role | null;
  onClose: () => void;
  onCloned: (role: Role) => void;
}

/** Copies a group into a new custom group with the same permissions and limits (CORE-22). */
export function CloneRoleDialog({ role, onClose, onCloned }: CloneRoleDialogProps) {
  const { t, i18n } = useTranslation(['roles', 'common']);
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const clone = useCloneRole();
  const [name, setName] = useState<LocalizedText | null>(null);
  const sourceName = role ? localize(role.name, locale) : '';
  const value: LocalizedText = name ?? {
    vi: t('cloneDialog.copyOf', { name: role?.name.vi ?? '', lng: 'vi' }),
    ...(role?.name.en ? { en: t('cloneDialog.copyOf', { name: role.name.en, lng: 'en' }) } : {}),
  };
  const isNameMissing = value.vi.trim() === '';

  const close = () => {
    setName(null);
    onClose();
  };

  return (
    <Dialog
      open={role !== null}
      onClose={close}
      title={t('cloneDialog.title', { name: sourceName })}
      description={t('cloneDialog.description')}
      footer={
        <>
          <Button onClick={close}>{t('actions.cancel')}</Button>
          <Button
            variant="primary"
            loading={clone.isPending}
            disabled={isNameMissing}
            onClick={() => {
              if (!role) {
                return;
              }
              clone.mutate(
                { id: role.id, input: { name: value } },
                {
                  onSuccess: (created) => {
                    toast({
                      tone: 'success',
                      message: t('toast.cloned', { name: localize(created.name, locale) }),
                    });
                    setName(null);
                    onCloned(created);
                  },
                  onError: (error) => {
                    toast({ tone: 'danger', message: apiErrorMessage(error) });
                  },
                },
              );
            }}
          >
            {t('cloneDialog.submit')}
          </Button>
        </>
      }
    >
      <LocalizedInput
        label={t('cloneDialog.name')}
        value={value}
        onChange={setName}
        {...(isNameMissing ? { error: t('edit.nameRequired') } : {})}
      />
    </Dialog>
  );
}
