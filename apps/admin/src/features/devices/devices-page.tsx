import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDevices, useMe } from '@fnb/api-client';
import { Button, Dialog, FilterBar, PageHeader, Select, usePermission } from '@fnb/ui-web';

import { DeviceList } from './device-list';

import type { DeviceListQuery } from '@fnb/contract';

type DeviceStatus = DeviceListQuery['status'];

/** HT7 Devices (CORE-30, 31): every POS, handheld and kitchen screen, and revoking one. */
export function DevicesPage() {
  const { t } = useTranslation(['devices', 'admin']);
  const me = useMe();
  const canManage = usePermission('device.manage');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<DeviceStatus>('active');
  const [isHelpOpen, setHelpOpen] = useState(false);
  const devices = useDevices({ status, ...(branchId ? { branchId } : {}) });
  const activeCount = (devices.data ?? []).filter((device) => device.isActive).length;

  const branchOptions = [
    { value: 'all', label: t('filters.allBranches') },
    ...(me.data?.branches ?? [])
      .filter((entry) => entry.permissions.includes('device.manage'))
      .map((entry) => ({ value: entry.branch.id, label: entry.branch.name })),
  ];
  const statusOptions: { value: DeviceStatus; label: string }[] = [
    { value: 'active', label: t('filters.active') },
    { value: 'revoked', label: t('filters.revoked') },
    { value: 'all', label: t('filters.all') },
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        breadcrumb={[{ label: t('admin:nav.groups.system') }, { label: t('title') }]}
        description={
          devices.data
            ? `${t('description', { count: activeCount })} · ${t('subtitle')}`
            : t('subtitle')
        }
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setHelpOpen(true);
            }}
          >
            {t('register')}
          </Button>
        }
      />
      <FilterBar
        isFiltered={branchId !== '' || status !== 'active'}
        onClear={() => {
          setBranchId('');
          setStatus('active');
        }}
      >
        <Select
          label={t('filters.branch')}
          hideLabel
          options={branchOptions}
          value={branchId === '' ? 'all' : branchId}
          onChange={(value) => {
            setBranchId(value === 'all' ? '' : value);
          }}
        />
        <Select
          label={t('filters.status')}
          hideLabel
          options={statusOptions}
          value={status}
          onChange={(value) => {
            const next = statusOptions.find((option) => option.value === value);
            if (next) {
              setStatus(next.value);
            }
          }}
        />
      </FilterBar>
      <DeviceList
        devices={devices.data}
        loading={devices.isPending}
        error={devices.isError}
        onRetry={() => void devices.refetch()}
        canRevoke={canManage}
      />
      <Dialog
        open={isHelpOpen}
        onClose={() => {
          setHelpOpen(false);
        }}
        title={t('registerDialog.title')}
        description={t('registerDialog.description')}
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setHelpOpen(false);
            }}
          >
            {t('registerDialog.done')}
          </Button>
        }
      >
        <ol className="text-text flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>{t('registerDialog.step1')}</li>
          <li>{t('registerDialog.step2')}</li>
          <li>{t('registerDialog.step3')}</li>
          <li>{t('registerDialog.step4')}</li>
        </ol>
      </Dialog>
    </>
  );
}
