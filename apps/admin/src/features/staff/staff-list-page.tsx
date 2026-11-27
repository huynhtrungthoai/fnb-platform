import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMe, useRoles, useSetUserActive, useUnlockUser, useUsers } from '@fnb/api-client';
import { formatDateTime, localize, resolveLocale } from '@fnb/i18n';
import {
  Button,
  Can,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  Menu,
  PageHeader,
  Pagination,
  Select,
  toast,
  usePermission,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { CreateStaffDialog } from './create-staff-dialog';
import { ResetPinDialogs } from './reset-pin-dialogs';
import { AssignmentBadges, UserAvatar, UserStatusBadge } from './staff-badges';

import type { UserListQuery, UserWithAssignments } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

/** Filters of the staff list, kept in the URL. */
export interface StaffFilters {
  page: number;
  search: string;
  status: UserListQuery['status'];
  branchId: string;
  roleId: string;
}

export const DEFAULT_STAFF_FILTERS: StaffFilters = {
  page: 1,
  search: '',
  status: 'all',
  branchId: '',
  roleId: '',
};

const PAGE_SIZE = 20;

export interface StaffListPageProps {
  filters: StaffFilters;
  onFiltersChange: (filters: StaffFilters) => void;
  onOpen: (userId: string) => void;
  onOpenRoles: () => void;
}

/**
 * HT2 Staff (CORE-10): the first Admin list screen and the model for the others
 * (docs/ui-rules.md section 3): `PageHeader` → `FilterBar` → `DataTable` → `Pagination`.
 */
export function StaffListPage({
  filters,
  onFiltersChange,
  onOpen,
  onOpenRoles,
}: StaffListPageProps) {
  const { t, i18n } = useTranslation(['staff', 'admin', 'common']);
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const me = useMe();
  const canViewRoles = usePermission('role.view');
  const roles = useRoles({ enabled: canViewRoles });
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchText);
  const [resetTarget, setResetTarget] = useState<UserWithAssignments | null>(null);
  const [disableTarget, setDisableTarget] = useState<UserWithAssignments | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const unlock = useUnlockUser();
  const setActive = useSetUserActive();

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  const query: Partial<UserListQuery> = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    status: filters.status,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.roleId ? { roleId: filters.roleId } : {}),
  };
  const users = useUsers(query);
  const locked = useUsers({ status: 'locked', pageSize: 1 });
  const lockedCount = locked.data?.meta.total ?? 0;
  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.branchId !== '' ||
    filters.roleId !== '';
  const set = (patch: Partial<StaffFilters>) => {
    onFiltersChange({ ...filters, page: 1, ...patch });
  };

  const runUnlock = (user: UserWithAssignments) => {
    unlock.mutate(user.id, {
      onSuccess: () => {
        toast({ tone: 'success', message: t('toast.unlocked', { name: user.fullName }) });
      },
      onError: (error) => {
        toast({ tone: 'danger', message: apiErrorMessage(error) });
      },
    });
  };
  const runSetActive = (user: UserWithAssignments, isActive: boolean) => {
    setActive.mutate(
      { id: user.id, isActive },
      {
        onSuccess: () => {
          setDisableTarget(null);
          toast({
            tone: 'success',
            message: isActive
              ? t('toast.enabled', { name: user.fullName })
              : t('toast.disabled', { name: user.fullName }),
          });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  };

  const canReset = usePermission('user.reset_credentials');
  const canManage = usePermission('user.manage');
  const myId = me.data?.user.id;

  const columns: Column<UserWithAssignments>[] = [
    {
      key: 'staff',
      header: t('columns.staff'),
      cell: (user) => (
        <span className="flex items-center gap-3">
          <UserAvatar fullName={user.fullName} />
          <span className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={() => {
                onOpen(user.id);
              }}
              className="text-text focus-visible:outline-ring w-fit rounded-sm text-left font-semibold hover:underline focus-visible:outline-2"
            >
              {user.fullName}
            </button>
            {user.phone ? <span className="text-text-muted text-xs">{user.phone}</span> : null}
          </span>
        </span>
      ),
    },
    {
      key: 'username',
      header: t('columns.username'),
      hideOnMobile: true,
      cell: (user) => <code className="text-text-muted">{user.username}</code>,
    },
    {
      key: 'assignments',
      header: t('columns.assignments'),
      cell: (user) => (
        <AssignmentBadges
          assignments={user.assignments}
          isSuperAdmin={user.credentialType === 'password'}
        />
      ),
    },
    { key: 'status', header: t('columns.status'), cell: (user) => <UserStatusBadge user={user} /> },
    {
      key: 'lastLogin',
      header: t('columns.lastLogin'),
      align: 'end',
      hideOnMobile: true,
      cell: (user) =>
        user.lastLoginAt ? (
          formatDateTime(user.lastLoginAt, locale)
        ) : (
          <span className="text-text-subtle">{t('never')}</span>
        ),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (user) => {
        const isSelf = user.id === myId;
        const isSuperAdmin = user.credentialType === 'password';
        return (
          <span className="flex items-center justify-end gap-1">
            {user.isLocked && canReset && !isSuperAdmin ? (
              <Button
                size="sm"
                icon="unlock"
                loading={unlock.isPending && unlock.variables === user.id}
                onClick={() => {
                  runUnlock(user);
                }}
              >
                {t('actions.unlock')}
              </Button>
            ) : null}
            {canReset && !isSuperAdmin && !isSelf ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setResetTarget(user);
                }}
              >
                {t('actions.resetPin')}
              </Button>
            ) : null}
            <Menu
              trigger={
                <button
                  type="button"
                  aria-label={t('rowMenu', { name: user.fullName })}
                  className="size-control-sm rounded-control text-text-muted hover:bg-bg-muted focus-visible:outline-ring inline-flex items-center justify-center focus-visible:outline-2"
                >
                  <Icon name="more" size={16} />
                </button>
              }
              items={[
                {
                  key: 'open',
                  label: t('actions.open'),
                  icon: 'user',
                  onSelect: () => {
                    onOpen(user.id);
                  },
                },
                ...(canManage && !isSelf
                  ? [
                      user.isActive
                        ? {
                            key: 'disable',
                            label: t('actions.disable'),
                            icon: 'ban' as const,
                            tone: 'danger' as const,
                            onSelect: () => {
                              setDisableTarget(user);
                            },
                          }
                        : {
                            key: 'enable',
                            label: t('actions.enable'),
                            icon: 'restore' as const,
                            onSelect: () => {
                              runSetActive(user, true);
                            },
                          },
                    ]
                  : []),
              ]}
            />
          </span>
        );
      },
    },
  ];

  const branchOptions = [
    { value: 'all', label: t('filters.allBranches') },
    ...(me.data?.branches ?? []).map((entry) => ({
      value: entry.branch.id,
      label: entry.branch.name,
    })),
  ];
  const roleOptions = [
    { value: 'all', label: t('filters.allRoles') },
    ...(roles.data ?? []).map((role) => ({ value: role.id, label: localize(role.name, locale) })),
  ];
  const statusOptions = [
    { value: 'all', label: t('filters.statusAll') },
    { value: 'active', label: t('filters.statusActive') },
    { value: 'locked', label: t('filters.statusLocked') },
    { value: 'disabled', label: t('filters.statusDisabled') },
  ];

  const addButton = (
    <Can permission="user.manage">
      <Button
        variant="primary"
        icon="plus"
        onClick={() => {
          setCreateOpen(true);
        }}
      >
        {t('add')}
      </Button>
    </Can>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        breadcrumb={[{ label: t('admin:nav.groups.people') }, { label: t('title') }]}
        {...(users.data ? { description: t('description', { count: users.data.meta.total }) } : {})}
        actions={
          <>
            {canViewRoles ? (
              <Button icon="shield" onClick={onOpenRoles}>
                {t('rolesLink')}
              </Button>
            ) : null}
            {addButton}
          </>
        }
      />
      {lockedCount > 0 ? (
        <p
          role="status"
          className="bg-warning-subtle text-warning-text rounded-control flex items-start gap-2 p-3 text-sm"
        >
          <Icon name="lock" size={16} className="mt-0.5" />
          <span>{t('lockedBanner', { count: lockedCount })}</span>
        </p>
      ) : null}
      <FilterBar
        search={{
          label: t('filters.search'),
          value: searchText,
          onChange: setSearchText,
          placeholder: t('filters.searchPlaceholder'),
        }}
        isFiltered={isFiltered}
        onClear={() => {
          setSearchText('');
          onFiltersChange(DEFAULT_STAFF_FILTERS);
        }}
      >
        <Select
          label={t('filters.branch')}
          hideLabel
          options={branchOptions}
          value={filters.branchId === '' ? 'all' : filters.branchId}
          onChange={(value) => {
            set({ branchId: value === 'all' ? '' : value });
          }}
        />
        {canViewRoles ? (
          <Select
            label={t('filters.role')}
            hideLabel
            options={roleOptions}
            value={filters.roleId === '' ? 'all' : filters.roleId}
            onChange={(value) => {
              set({ roleId: value === 'all' ? '' : value });
            }}
          />
        ) : null}
        <Select
          label={t('filters.status')}
          hideLabel
          options={statusOptions}
          value={filters.status}
          onChange={(value) => {
            const status = statusOptions.find((option) => option.value === value)?.value;
            if (
              status === 'all' ||
              status === 'active' ||
              status === 'locked' ||
              status === 'disabled'
            ) {
              set({ status });
            }
          }}
        />
      </FilterBar>
      <DataTable
        label={t('tableLabel')}
        columns={columns}
        rows={users.data?.data}
        rowKey={(user) => user.id}
        loading={users.isPending}
        error={users.isError}
        onRetry={() => void users.refetch()}
        rowTone={(user) => (user.isLocked ? 'warning' : user.isActive ? 'default' : 'muted')}
        empty={
          <EmptyState
            description={isFiltered ? t('empty') : t('emptyAction')}
            {...(isFiltered ? {} : { action: addButton })}
          />
        }
        footer={
          users.data ? (
            <Pagination
              page={users.data.meta.page}
              pageSize={users.data.meta.pageSize}
              total={users.data.meta.total}
              onChange={(page) => {
                onFiltersChange({ ...filters, page });
              }}
            />
          ) : null
        }
      />
      <ResetPinDialogs
        user={resetTarget}
        onClose={() => {
          setResetTarget(null);
        }}
      />
      <ConfirmDialog
        open={disableTarget !== null}
        onClose={() => {
          setDisableTarget(null);
        }}
        onConfirm={() => {
          if (disableTarget) {
            runSetActive(disableTarget, false);
          }
        }}
        tone="danger"
        confirmIcon="ban"
        title={t('disable.title', { name: disableTarget?.fullName ?? '' })}
        description={t('disable.description')}
        confirmLabel={t('actions.disable')}
        loading={setActive.isPending}
      />
      <CreateStaffDialog
        open={isCreateOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
        onCreated={(user) => {
          setCreateOpen(false);
          onOpen(user.id);
        }}
      />
    </>
  );
}
