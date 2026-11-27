import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRevokeDevice } from '@fnb/api-client';
import { formatDateTime, resolveLocale } from '@fnb/i18n';
import {
  Badge,
  ConfirmDialog,
  DangerButton,
  DataTable,
  EmptyState,
  Icon,
  toast,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';

import type { Device } from '@fnb/contract';
import type { Column, IconName } from '@fnb/ui-web';
import type { ReactNode } from 'react';

const KIND_ICONS: Record<Device['kind'], IconName> = {
  pos: 'monitor',
  handheld: 'device',
  kds: 'scroll-text',
};

export interface DeviceListProps {
  devices: readonly Device[] | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** The branch column is left out when the list is about one branch. */
  showBranch?: boolean;
  /** `device.manage`: the revoke button. */
  canRevoke: boolean;
  empty?: ReactNode;
}

/** Registered POS, handheld and kitchen devices, with revoke behind a danger confirmation. */
export function DeviceList({
  devices,
  loading,
  error,
  onRetry,
  showBranch = true,
  canRevoke,
  empty,
}: DeviceListProps) {
  const { t, i18n } = useTranslation('devices');
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const revoke = useRevokeDevice();
  const [target, setTarget] = useState<Device | null>(null);

  const columns: Column<Device>[] = [
    {
      key: 'device',
      header: t('columns.device'),
      cell: (device) => (
        <span className="flex items-center gap-2">
          <Icon name={KIND_ICONS[device.kind]} size={20} className="text-text-muted" />
          <span className="flex flex-col">
            <span className="font-semibold whitespace-nowrap">{device.name}</span>
            <span className="text-text-muted text-xs">{t(`kind.${device.kind}`)}</span>
          </span>
        </span>
      ),
    },
    ...(showBranch
      ? [
          {
            key: 'branch',
            header: t('columns.branch'),
            cell: (device: Device) => device.branch.name,
          },
        ]
      : []),
    {
      key: 'code',
      header: t('columns.code'),
      cell: (device) => <code className="whitespace-nowrap">{device.code}</code>,
    },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (device) =>
        device.isActive ? (
          <Badge tone="success" icon="check">
            {t('status.active')}
          </Badge>
        ) : (
          <Badge icon="ban">{t('status.revoked')}</Badge>
        ),
    },
    {
      key: 'lastSeen',
      header: t('columns.lastSeen'),
      hideOnMobile: true,
      cell: (device) =>
        device.lastSeenAt ? (
          formatDateTime(device.lastSeenAt, locale)
        ) : (
          <span className="text-text-subtle">{t('never')}</span>
        ),
    },
    {
      key: 'version',
      header: t('columns.version'),
      align: 'end',
      hideOnMobile: true,
      cell: (device) => device.appVersion ?? t('nobody'),
    },
    {
      key: 'lastUser',
      header: t('columns.lastUser'),
      hideOnMobile: true,
      cell: (device) => device.lastUser?.fullName ?? t('nobody'),
    },
    {
      key: 'actions',
      header: t('columns.actions'),
      align: 'end',
      cell: (device) =>
        canRevoke && device.isActive ? (
          <DangerButton
            icon="ban"
            onClick={() => {
              setTarget(device);
            }}
          >
            {t('revoke')}
          </DangerButton>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        label={t('tableLabel')}
        columns={columns}
        rows={devices}
        rowKey={(device) => device.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        rowTone={(device) => (device.isActive ? 'default' : 'muted')}
        empty={empty ?? <EmptyState description={t('empty')} />}
      />
      <ConfirmDialog
        open={target !== null}
        onClose={() => {
          setTarget(null);
        }}
        onConfirm={() => {
          if (!target) {
            return;
          }
          revoke.mutate(target.id, {
            onSuccess: (device) => {
              setTarget(null);
              toast({ tone: 'success', message: t('revoked', { name: device.name }) });
            },
            onError: (failure) => {
              toast({ tone: 'danger', message: apiErrorMessage(failure) });
            },
          });
        }}
        tone="danger"
        confirmIcon="ban"
        title={t('revokeDialog.title', { name: target?.name ?? '' })}
        description={t('revokeDialog.description', { code: target?.code ?? '' })}
        confirmLabel={t('revoke')}
        loading={revoke.isPending}
      />
    </>
  );
}
