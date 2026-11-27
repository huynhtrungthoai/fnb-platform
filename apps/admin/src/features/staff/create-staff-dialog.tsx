import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useCreateUser, useMe, useRoles } from '@fnb/api-client';
import { pinSchema, usernameSchema } from '@fnb/contract';
import { localize, resolveLocale } from '@fnb/i18n';
import { Button, Dialog, Select, toast } from '@fnb/ui-web';

import { useApiErrorMessage, useFieldErrorMessage } from '../../lib/form-errors';
import { generateTempPin } from '../../lib/temp-pin';
import { FormTextField } from '../../shared-components/form-text-field';
import { TempPinDialog } from './reset-pin-dialogs';

import type { UserWithAssignments } from '@fnb/contract';

/** Value of the branch field for the all-branches assignment. */
const ALL_BRANCHES = 'all';

const createStaffFormSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20),
  username: usernameSchema,
  pin: pinSchema,
  branchId: z.string().min(1),
  roleId: z.uuid(),
});

type CreateStaffForm = z.input<typeof createStaffFormSchema>;

export interface CreateStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserWithAssignments) => void;
}

/** Creates a staff account with a temporary PIN and its first branch and group (CORE-10, 11). */
export function CreateStaffDialog({ open, onClose, onCreated }: CreateStaffDialogProps) {
  const { t, i18n } = useTranslation(['staff', 'common']);
  const locale = resolveLocale(i18n.language);
  const fieldErrorMessage = useFieldErrorMessage();
  const apiErrorMessage = useApiErrorMessage();
  const me = useMe();
  const roles = useRoles({ enabled: open });
  const create = useCreateUser();
  const [created, setCreated] = useState<{ user: UserWithAssignments; pin: string } | null>(null);

  // Places the caller may assign: branches where they hold `role.assign`, and every branch when
  // their own assignment covers them all.
  const branchOptions = [
    ...(me.data?.hasAllBranches ? [{ value: ALL_BRANCHES, label: t('allBranches') }] : []),
    ...(me.data?.branches ?? [])
      .filter((entry) => entry.permissions.includes('role.assign'))
      .map((entry) => ({ value: entry.branch.id, label: entry.branch.name })),
  ];
  const roleOptions = (roles.data ?? [])
    .filter((role) => !role.isLocked)
    .map((role) => ({ value: role.id, label: localize(role.name, locale) }));

  const form = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffFormSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      username: '',
      pin: generateTempPin(),
      branchId: '',
      roleId: '',
    },
  });

  const close = () => {
    form.reset({ ...form.formState.defaultValues, pin: generateTempPin() });
    create.reset();
    onClose();
  };

  const submit = form.handleSubmit((values) => {
    create.mutate(
      {
        fullName: values.fullName,
        phone: values.phone === '' ? null : values.phone,
        username: values.username,
        pin: values.pin,
        assignments: [
          {
            branchId: values.branchId === ALL_BRANCHES ? null : values.branchId,
            roleId: values.roleId,
          },
        ],
      },
      {
        onSuccess: (user) => {
          toast({ tone: 'success', message: t('toast.created', { name: user.fullName }) });
          setCreated({ user, pin: values.pin });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  });

  return (
    <>
      <Dialog
        open={open && created === null}
        onClose={close}
        title={t('createDialog.title')}
        description={t('createDialog.description')}
        size="lg"
        footer={
          <>
            <Button onClick={close}>{t('actions.cancel')}</Button>
            <Button
              type="submit"
              form="create-staff-form"
              variant="primary"
              loading={create.isPending}
            >
              {t('actions.create')}
            </Button>
          </>
        }
      >
        <form
          id="create-staff-form"
          noValidate
          onSubmit={(event) => void submit(event)}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <FormTextField control={form.control} name="fullName" label={t('fields.fullName')} />
          <FormTextField control={form.control} name="phone" label={t('fields.phone')} type="tel" />
          <FormTextField
            control={form.control}
            name="username"
            label={t('fields.username')}
            hint={t('fields.usernameHint')}
            autoCapitalize="none"
            spellCheck={false}
          />
          <div className="flex items-end gap-2">
            <FormTextField
              control={form.control}
              name="pin"
              label={t('fields.pin')}
              hint={t('fields.pinHint')}
              inputMode="numeric"
              maxLength={6}
              className="flex-1"
            />
          </div>
          <Controller
            control={form.control}
            name="branchId"
            render={({ field, fieldState }) => (
              <Select
                label={t('fields.branch')}
                options={branchOptions}
                value={field.value}
                onChange={field.onChange}
                error={fieldErrorMessage(fieldState.error)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="roleId"
            render={({ field, fieldState }) => (
              <Select
                label={t('fields.role')}
                options={roleOptions}
                value={field.value}
                onChange={field.onChange}
                error={fieldErrorMessage(fieldState.error)}
              />
            )}
          />
        </form>
      </Dialog>
      <TempPinDialog
        name={created?.user.fullName ?? ''}
        pin={created?.pin ?? null}
        onClose={() => {
          const user = created?.user;
          setCreated(null);
          form.reset({ ...form.formState.defaultValues, pin: generateTempPin() });
          if (user) {
            onCreated(user);
          }
        }}
      />
    </>
  );
}
