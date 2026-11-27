import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { ChangePinPage } from '../features/auth/change-pin-page';
import { loadMe } from '../lib/session';

function ChangePinRoute() {
  const navigate = useNavigate();
  return (
    <ChangePinPage
      onDone={() => void navigate({ to: '/' })}
      onSignedOut={() => void navigate({ to: '/login', search: { redirect: '/' } })}
    />
  );
}

export const Route = createFileRoute('/change-pin')({
  beforeLoad: async ({ context }) => {
    const me = await loadMe(context);
    if (!me) {
      redirect({ to: '/login', search: { redirect: '/' }, throw: true });
    }
  },
  component: ChangePinRoute,
});
