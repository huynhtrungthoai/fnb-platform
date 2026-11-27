import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSetUserActive, useUpdateUser } from '@fnb/api-client';
import { Button, ConfirmDialog, DangerButton, FormActions, FormSection, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { FormTextField } from '../../shared-components/form-text-field';

import type { UserWithAssignments } from '@fnb/contract';

const infoFormSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20),
});

type InfoForm = z.input<typeof infoFormSchema>;

export interface StaffInfoTabProps {
  user: UserWithAssignments;
  /** `user.manage`, and not the caller's own account. */
  canManage: boolean;
}

/** Name and phone of a staff member; disable or enable the account. */
export function StaffInfoTab({ user, canManage }: StaffInfoTabProps) {
  const { t } = useTranslation(['staff', 'common']);
  const apiErrorMessage = useApiErrorMessage();
  const update = useUpdateUser();
  const setActive = useSetUserActive();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const values: InfoForm = { fullName: user.fullName, phone: user.phone ?? '' };
  const form = useForm<InfoForm>({ resolver: zodResolver(infoFormSchema), values });

  const submit = form.handleSubmit((output) => {
    update.mutate(
      {
        id: user.id,
        input: { fullName: output.fullName, phone: output.phone === '' ? null : output.phone },
      },
      {
        onSuccess: (saved) => {
          toast({ tone: 'success', message: t('toast.saved', { name: saved.fullName }) });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  });

  const runSetActive = (isActive: boolean) => {
    setActive.mutate(
      { id: user.id, isActive },
      {
        onSuccess: (saved) => {
          setConfirmOpen(false);
          toast({
            tone: 'success',
            message: isActive
              ? t('toast.enabled', { name: saved.fullName })
              : t('toast.disabled', { name: saved.fullName }),
          });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormSection title={t('detail.infoSection')}>
        <FormTextField
          control={form.control}
          name="fullName"
          label={t('fields.fullName')}
          disabled={!canManage}
        />
        <FormTextField
          control={form.control}
          name="phone"
          label={t('fields.phone')}
          type="tel"
          disabled={!canManage}
        />
      </FormSection>
      {canManage ? (
        <FormActions
          danger={
            user.isActive ? (
              <DangerButton
                icon="ban"
                onClick={() => {
                  setConfirmOpen(true);
                }}
              >
                {t('actions.disable')}
              </DangerButton>
            ) : (
              <Button
                icon="restore"
                loading={setActive.isPending}
                onClick={() => {
                  runSetActive(true);
                }}
              >
                {t('actions.enable')}
              </Button>
            )
          }
          secondary={
            <Button
              disabled={!form.formState.isDirty || update.isPending}
              onClick={() => {
                form.reset(values);
              }}
            >
              {t('actions.cancel')}
            </Button>
          }
          primary={
            <Button
              type="submit"
              variant="primary"
              loading={update.isPending}
              disabled={!form.formState.isDirty}
            >
              {t('actions.save')}
            </Button>
          }
        />
      ) : null}
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => {
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          runSetActive(false);
        }}
        tone="danger"
        confirmIcon="ban"
        title={t('disable.title', { name: user.fullName })}
        description={t('disable.description')}
        confirmLabel={t('actions.disable')}
        loading={setActive.isPending}
      />
    </form>
  );
}
