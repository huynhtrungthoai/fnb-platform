import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useLogout, useMe } from '@fnb/api-client';
import { localize, resolveLocale } from '@fnb/i18n';
import { AppShell, Menu, PermissionProvider, Select, Sidebar, toast } from '@fnb/ui-web';

import { resolveWorkingAccess } from '../../lib/access';
import { setSelectedBranchId, useSelectedBranchId } from '../../lib/branch-store';
import { changeLocale } from '../../lib/i18n';
import { SettingsBar } from '../../shared-components/settings-bar';
import { activeNavKey, buildNavigation } from './navigation';

import type { ReactNode } from 'react';

/** Initials for the account button: first letters of the last two words of the name. */
function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).slice(-2);
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

export interface AdminShellProps {
  children: ReactNode;
}

/**
 * Frame of the signed-in Admin (CORE-03): menu by permission, working branch, language,
 * appearance and account. Permissions of the working branch reach every screen through
 * `PermissionProvider`.
 */
export function AdminShell({ children }: AdminShellProps) {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const me = useMe();
  const storedBranchId = useSelectedBranchId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();
  const logout = useLogout();
  const logoutEverywhere = useLogout({ everywhere: true });

  const access = resolveWorkingAccess(me.data, storedBranchId);
  const currentBranchId = access.current?.branch.id ?? null;

  useEffect(() => {
    // Keeps the stored choice valid when assignments change (a branch removed from the user).
    setSelectedBranchId(currentBranchId);
  }, [currentBranchId]);

  useEffect(() => {
    // The session ended in this tab or another one: back to sign in.
    if (me.data === null) {
      void navigate({ to: '/login', search: { redirect: location.href } });
    }
  }, [me.data, navigate, location.href]);

  const switchBranch = (branchId: string) => {
    const target = access.branches.find((entry) => entry.branch.id === branchId);
    if (!target || branchId === currentBranchId) {
      return;
    }
    setSelectedBranchId(branchId);
    // Every screen's data belongs to a branch: drop it rather than show the old branch's rows.
    void queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    toast({ tone: 'info', message: t('shell.branchChanged', { branch: target.branch.name }) });
  };

  const signOut = (everywhere: boolean) => {
    (everywhere ? logoutEverywhere : logout).mutate(undefined, {
      onSettled: () => void navigate({ to: '/login', search: { redirect: '/' } }),
    });
  };

  const user = me.data?.user;
  const roleName = access.current
    ? localize(access.current.role.name, resolveLocale(i18n.language))
    : '';
  const isPin = (user?.credentialType ?? 'pin') === 'pin';

  const branchOptions = access.branches.map((entry) => ({
    value: entry.branch.id,
    label: entry.branch.name,
    description: entry.branch.isActive
      ? entry.branch.code
      : `${entry.branch.code} · ${t('shell.inactiveBranch')}`,
  }));

  const topbar = (
    <>
      {branchOptions.length > 0 ? (
        <Select
          label={t('shell.branch')}
          hideLabel
          options={branchOptions}
          value={currentBranchId ?? ''}
          onChange={switchBranch}
          className="min-w-48"
        />
      ) : (
        <span className="text-text-muted text-sm">{t('shell.noBranch')}</span>
      )}
      <SettingsBar onLocaleChange={(locale) => void changeLocale(locale)} />
      <Menu
        trigger={
          <button
            type="button"
            aria-label={t('shell.account')}
            className="h-control rounded-control hover:bg-bg-muted focus-visible:outline-ring flex items-center gap-2 px-2 focus-visible:outline-2"
          >
            <span className="size-control-sm bg-primary-subtle text-primary-text inline-flex items-center justify-center rounded-full text-sm font-semibold">
              {initials(user?.fullName ?? '')}
            </span>
            <span className="hidden flex-col items-start text-left md:flex">
              <span className="text-text text-sm font-semibold">{user?.fullName ?? ''}</span>
              <span className="text-text-muted text-xs">{roleName}</span>
            </span>
          </button>
        }
        header={
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user?.fullName ?? ''}</span>
            <span className="text-text-muted text-xs">{user?.username ?? ''}</span>
          </div>
        }
        items={[
          {
            key: 'change-secret',
            label: isPin ? t('shell.changePin') : t('shell.changePassword'),
            icon: 'key',
            onSelect: () => void navigate({ to: '/change-pin' }),
          },
          {
            key: 'logout',
            label: t('shell.logout'),
            icon: 'log-out',
            onSelect: () => {
              signOut(false);
            },
          },
          {
            key: 'logout-all',
            label: t('shell.logoutEverywhere'),
            icon: 'log-out',
            tone: 'danger',
            onSelect: () => {
              signOut(true);
            },
          },
        ]}
      />
    </>
  );

  return (
    <PermissionProvider permissions={access.permissions}>
      <AppShell
        topbar={topbar}
        sidebar={
          <Sidebar
            label={t('shell.menu')}
            brand={
              <div className="flex items-center gap-2">
                <img src="/logo-icon.png" alt="" className="size-control-sm" />
                <div className="flex flex-col">
                  <span className="text-text text-sm font-bold">{t('shell.brand')}</span>
                  <span className="text-text-muted text-xs">{t('shell.brandSub')}</span>
                </div>
              </div>
            }
            groups={buildNavigation(t)}
            activeKey={activeNavKey(location.pathname)}
            onNavigate={(href) => {
              router.history.push(href);
            }}
          />
        }
      >
        {children}
      </AppShell>
    </PermissionProvider>
  );
}
