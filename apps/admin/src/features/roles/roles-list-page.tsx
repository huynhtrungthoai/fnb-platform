import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDeleteRole, usePermissionCatalog, useRoles } from '@fnb/api-client';
import { formatDate, localize, resolveLocale } from '@fnb/i18n';
import {
  Badge,
  Button,
  Can,
  ConfirmDialog,
  DataTable,
  Icon,
  PageHeader,
  toast,
  usePermission,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { CloneRoleDialog } from './clone-role-dialog';
import { newPermissions, useLimitsSummary } from './role-helpers';

import type { Role } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

export interface RolesListPageProps {
  onOpen: (roleId: string) => void;
  onCreate: () => void;
  onCompare: () => void;
}

/** HT4 Permission groups (CORE-21, 22, 26): defaults, custom groups, members and limits. */
export function RolesListPage({ onOpen, onCreate, onCompare }: RolesListPageProps) {
  const { t, i18n } = useTranslation(['roles', 'permissions', 'admin']);
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const canManage = usePermission('role.manage');
  const remove = useDeleteRole();
  const limitsSummary = useLimitsSummary();
  const [cloneSource, setCloneSource] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const rows = roles.data ?? [];
  const catalogRows = catalog.data ?? [];
  const hasNewOnCustom = rows.some(
    (role) => !role.isSystem && newPermissions(catalogRows, role).size > 0,
  );

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      cell: (role) => (
        <span className="flex flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpen(role.id);
              }}
              className="text-text focus-visible:outline-ring rounded-sm text-left font-semibold hover:underline focus-visible:outline-2"
            >
              {localize(role.name, locale)}
            </button>
            {newPermissions(catalogRows, role).size > 0 ? (
              <Badge tone="primary">{t('permissions:labels.new')}</Badge>
            ) : null}
          </span>
          <span className="text-text-muted text-xs">
            {[role.code, locale === 'vi' ? role.name.en : role.name.vi].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    },
    {
      key: 'type',
      header: t('columns.type'),
      cell: (role) =>
        role.isLocked ? (
          <Badge tone="info" icon="lock">
            {t('type.locked')}
          </Badge>
        ) : role.isSystem ? (
          <Badge icon="shield">{t('type.system')}</Badge>
        ) : (
          <Badge tone="primary" icon="edit">
            {t('type.custom')}
          </Badge>
        ),
    },
    {
      key: 'permissions',
      header: t('columns.permissions'),
      align: 'end',
      cell: (role) => role.permissions.length,
    },
    {
      key: 'members',
      header: t('columns.members'),
      align: 'end',
      cell: (role) => role.memberCount,
    },
    {
      key: 'limits',
      header: t('columns.limits'),
      hideOnMobile: true,
      cell: (role) => (
        <span className="text-text-muted">{limitsSummary(role.limits) ?? t('noLimits')}</span>
      ),
    },
    {
      key: 'updated',
      header: t('columns.updated'),
      align: 'end',
      hideOnMobile: true,
      cell: (role) => formatDate(role.updatedAt, locale),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (role) => (
        <span className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onOpen(role.id);
            }}
          >
            {canManage && !role.isLocked ? t('actions.edit') : t('actions.view')}
          </Button>
          {canManage && !role.isLocked ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCloneSource(role);
              }}
            >
              {t('actions.clone')}
            </Button>
          ) : null}
          {canManage && !role.isSystem && role.memberCount === 0 ? (
            <Button
              size="sm"
              variant="ghost"
              icon="trash"
              onClick={() => {
                setDeleteTarget(role);
              }}
            >
              {t('actions.delete')}
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  const systemCount = rows.filter((role) => role.isSystem).length;
  return (
    <>
      <PageHeader
        title={t('title')}
        breadcrumb={[{ label: t('admin:nav.groups.system') }, { label: t('title') }]}
        {...(roles.data && catalog.data
          ? {
              description: t('description', {
                system: systemCount,
                custom: rows.length - systemCount,
                permissions: catalogRows.length,
              }),
            }
          : {})}
        actions={
          <>
            <Button icon="compare" onClick={onCompare}>
              {t('compare')}
            </Button>
            <Can permission="role.manage">
              <Button variant="primary" icon="plus" onClick={onCreate}>
                {t('create')}
              </Button>
            </Can>
          </>
        }
      />
      {hasNewOnCustom ? (
        <p
          role="status"
          className="bg-info-subtle text-info-text rounded-control flex items-start gap-2 p-3 text-sm"
        >
          <Icon name="info" size={16} className="mt-0.5" />
          <span>{t('newBanner')}</span>
        </p>
      ) : null}
      <DataTable
        label={t('tableLabel')}
        columns={columns}
        rows={roles.data}
        rowKey={(role) => role.id}
        loading={roles.isPending}
        error={roles.isError}
        onRetry={() => void roles.refetch()}
      />
      <p className="text-text-muted text-sm">{t('footnote')}</p>
      <CloneRoleDialog
        role={cloneSource}
        onClose={() => {
          setCloneSource(null);
        }}
        onCloned={(created) => {
          setCloneSource(null);
          onOpen(created.id);
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          const name = localize(deleteTarget.name, locale);
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              toast({ tone: 'success', message: t('toast.deleted', { name }) });
            },
            onError: (error) => {
              toast({ tone: 'danger', message: apiErrorMessage(error) });
            },
          });
        }}
        tone="danger"
        confirmIcon="trash"
        title={t('deleteDialog.title', {
          name: deleteTarget ? localize(deleteTarget.name, locale) : '',
        })}
        description={t('deleteDialog.description')}
        confirmLabel={t('actions.delete')}
        loading={remove.isPending}
      />
    </>
  );
}
