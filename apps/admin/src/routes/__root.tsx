import { createRootRoute, Outlet, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ErrorState, ThemeProvider, Toaster } from '@fnb/ui-web';

function RootLayout() {
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    // The brand name is configuration data (M1); until then the tab shows the app's role.
    document.title = t('app.admin');
  }, [t, i18n.language]);

  return (
    <ThemeProvider theme="admin">
      <Outlet />
      <Toaster />
    </ThemeProvider>
  );
}

function NotFound() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  return (
    <EmptyState
      title={t('app.notFound')}
      action={<Button onClick={() => void navigate({ to: '/' })}>{t('app.backHome')}</Button>}
    />
  );
}

/** Every route gets an error boundary: a crash in one screen never blanks the whole app. */
function RouteError() {
  const router = useRouter();
  return <ErrorState onRetry={() => void router.invalidate()} />;
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});
