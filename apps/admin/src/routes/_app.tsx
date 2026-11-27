import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AdminShell } from '../features/shell/admin-shell';
import { resolveWorkingAccess } from '../lib/access';
import { getSelectedBranchId, setSelectedBranchId } from '../lib/branch-store';
import { loadMe } from '../lib/session';

function AppLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

/** Every signed-in screen: needs a session whose PIN is not temporary. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await loadMe(context);
    if (!me) {
      redirect({ to: '/login', search: { redirect: location.href }, throw: true });
      return;
    }
    if (me.user.mustChangePin) {
      redirect({ to: '/change-pin', throw: true });
    }
    // Settle the working branch before any screen sends `X-Branch-Id`.
    setSelectedBranchId(resolveWorkingAccess(me, getSelectedBranchId()).current?.branch.id ?? null);
  },
  component: AppLayout,
});
