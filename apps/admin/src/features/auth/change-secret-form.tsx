import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useChangePassword, useChangePin } from '@fnb/api-client';
import { passwordSchema, pinSchema } from '@fnb/contract';
import { Button, Icon, Input } from '@fnb/ui-web';

import { useApiErrorMessage, useFieldErrorMessage } from '../../lib/form-errors';

import type { CredentialType } from '@fnb/contract';
import type { ReactNode } from 'react';

const changeSecretSchema = (secret: z.ZodType<string, string>) =>
  z
    .object({ current: z.string().min(1), next: secret, confirm: z.string().min(1) })
    .refine((value) => value.next !== value.current, { path: ['next'], error: 'sameAsCurrent' })
    .refine((value) => value.confirm === value.next, { path: ['confirm'], error: 'mismatch' });

type ChangeSecretValues = z.infer<ReturnType<typeof changeSecretSchema>>;

export interface ChangeSecretFormProps {
  /** Staff change their PIN; the super admin changes their password (D-29). */
  credentialType: CredentialType;
  onDone: () => void;
  /** Extra buttons next to the submit button (cancel, sign out). */
  secondary?: ReactNode;
}

/** Changes the caller's own PIN or password (CORE-14); the server signs out other sessions. */
export function ChangeSecretForm({ credentialType, onDone, secondary }: ChangeSecretFormProps) {
  const { t } = useTranslation(['admin', 'common']);
  const fieldErrorMessage = useFieldErrorMessage();
  const apiErrorMessage = useApiErrorMessage();
  const isPin = credentialType === 'pin';
  const changePin = useChangePin();
  const changePassword = useChangePassword();
  const mutation = isPin ? changePin : changePassword;

  const form = useForm<ChangeSecretValues>({
    resolver: zodResolver(changeSecretSchema(isPin ? pinSchema : passwordSchema)),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const submit = form.handleSubmit((values) => {
    const options = { onSuccess: onDone };
    if (isPin) {
      changePin.mutate({ currentPin: values.current, newPin: values.next }, options);
    } else {
      changePassword.mutate({ currentPassword: values.current, newPassword: values.next }, options);
    }
  });

  const custom = {
    mismatch: t('changePin.mismatch'),
    sameAsCurrent: t('changePin.sameAsCurrent'),
  };
  const failure = mutation.error ? apiErrorMessage(mutation.error) : null;
  const pinProps = isPin
    ? { inputMode: 'numeric' as const, maxLength: 6, autoComplete: 'off' }
    : { autoComplete: 'new-password' };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="current"
        render={({ field, fieldState }) => (
          <Input
            label={isPin ? t('changePin.currentPin') : t('changePin.currentPassword')}
            type="password"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            {...(isPin ? pinProps : { autoComplete: 'current-password' })}
            error={fieldErrorMessage(fieldState.error, custom)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="next"
        render={({ field, fieldState }) => (
          <Input
            label={isPin ? t('changePin.newPin') : t('changePin.newPassword')}
            type="password"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            {...pinProps}
            hint={isPin ? t('changePin.pinHint') : t('changePin.passwordHint')}
            error={fieldErrorMessage(fieldState.error, custom)}
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirm"
        render={({ field, fieldState }) => (
          <Input
            label={isPin ? t('changePin.confirmPin') : t('changePin.confirmPassword')}
            type="password"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            {...pinProps}
            error={fieldErrorMessage(fieldState.error, custom)}
          />
        )}
      />
      {failure ? (
        <p
          role="alert"
          className="bg-danger-subtle text-danger-text rounded-control flex items-start gap-2 p-3 text-sm"
        >
          <Icon name="circle-alert" size={16} className="mt-0.5" />
          <span>{failure}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {secondary ?? null}
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          {t('changePin.submit')}
        </Button>
      </div>
    </form>
  );
}
