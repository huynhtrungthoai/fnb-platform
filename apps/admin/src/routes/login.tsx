import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { LoginPage } from '../features/auth/login-page';
import { safeRedirect } from '../features/auth/safe-redirect';
import { loadMe } from '../lib/session';

function LoginRoute() {
  const navigate = useNavigate();
  const { redirect: target } = Route.useSearch();
  return (
    <LoginPage
      onSignedIn={(tokens) => {
        // A temporary PIN must be changed before anything else (D-29).
        void navigate({ to: tokens.mustChangePin ? '/change-pin' : target });
      }}
    />
  );
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirect(search.redirect),
  }),
  beforeLoad: async ({ context, search }) => {
    // Already signed in (another tab, a bookmark): straight to the app.
    const me = await loadMe(context);
    if (me) {
      redirect({ to: search.redirect, throw: true });
    }
  },
  component: LoginRoute,
});
