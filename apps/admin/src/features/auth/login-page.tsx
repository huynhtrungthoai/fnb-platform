import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useLogin } from '@fnb/api-client';
import { loginSchema } from '@fnb/contract';
import { Button, Icon, Input } from '@fnb/ui-web';

import { useApiErrorMessage, useFieldErrorMessage } from '../../lib/form-errors';
import { AuthLayout } from './auth-layout';

import type { AuthTokens, LoginInput } from '@fnb/contract';
import type { z } from 'zod';

export interface LoginPageProps {
  /** Called once signed in, with the tokens (they say whether the PIN is temporary). */
  onSignedIn: (tokens: AuthTokens) => void;
}

/**
 * Admin sign-in (CORE-12, D-29): username and one field that takes a staff PIN or the super
 * admin's password. The server decides which by the account, so the screen never reveals it.
 */
export function LoginPage({ onSignedIn }: LoginPageProps) {
  const { t } = useTranslation(['admin', 'common']);
  const fieldErrorMessage = useFieldErrorMessage();
  const apiErrorMessage = useApiErrorMessage();
  const login = useLogin();
  const form = useForm<z.input<typeof loginSchema>, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', secret: '' },
  });

  const submit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (tokens) => {
        onSignedIn(tokens);
      },
      onError: () => {
        form.setValue('secret', '');
      },
    });
  });

  const failure = login.error ? apiErrorMessage(login.error) : null;

  return (
    <AuthLayout title={t('login.title')} description={t('shell.brand')}>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <Input
              label={t('login.username')}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              error={fieldErrorMessage(fieldState.error)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="secret"
          render={({ field, fieldState }) => (
            <Input
              label={t('login.secret')}
              type="password"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              autoComplete="current-password"
              error={fieldErrorMessage(fieldState.error)}
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
        <p className="bg-warning-subtle text-warning-text rounded-control flex items-start gap-2 p-3 text-sm">
          <Icon name="triangle-alert" size={16} className="mt-0.5" />
          <span>{t('login.lockWarning')}</span>
        </p>
        <Button type="submit" variant="primary" fullWidth loading={login.isPending}>
          {t('login.submit')}
        </Button>
        <p className="text-text-muted text-center text-sm">{t('login.samePin')}</p>
      </form>
    </AuthLayout>
  );
}
