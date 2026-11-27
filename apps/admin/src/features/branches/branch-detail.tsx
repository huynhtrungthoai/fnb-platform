import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBranch, useBranchSettings, useDevices, useMe } from '@fnb/api-client';
import { resolveLocale } from '@fnb/i18n';
import { Badge, Card, ErrorState, Skeleton, Tabs } from '@fnb/ui-web';

import { permissionsAt } from '../../lib/access';
import { DeviceList } from '../devices/device-list';
import { BranchInfoTab } from './branch-info-tab';
import { BranchReceiptTab } from './branch-receipt-tab';

export interface BranchDetailProps {
  branchId: string;
}

/** Right column of the branch screen: one branch with its settings, in tabs. */
export function BranchDetail({ branchId }: BranchDetailProps) {
  const { t, i18n } = useTranslation(['branches', 'devices']);
  const [tab, setTab] = useState('info');
  const me = useMe();
  const branch = useBranch(branchId);
  const settings = useBranchSettings(branchId);
  const granted = permissionsAt(me.data, branchId);
  const canManage = granted.has('branch.manage');
  const canEditSettings = granted.has('branch.settings');
  const canManageDevices = granted.has('device.manage');
  const devices = useDevices({ branchId, status: 'active' }, { enabled: canManageDevices });

  if (branch.isError || settings.isError) {
    return (
      <Card>
        <ErrorState
          onRetry={() => {
            void branch.refetch();
            void settings.refetch();
          }}
        />
      </Card>
    );
  }
  if (!branch.data || !settings.data) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <Skeleton shape="line" />
          <Skeleton shape="rect" />
          <Skeleton shape="rect" />
        </div>
      </Card>
    );
  }

  const data = branch.data;
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-text text-lg font-semibold">{data.name}</h2>
          {data.isActive ? (
            <Badge tone="success" icon="check">
              {t('status.active')}
            </Badge>
          ) : (
            <Badge icon="ban">{t('status.inactive')}</Badge>
          )}
        </div>
        <Tabs
          label={t('tabs.label')}
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'info',
              label: t('tabs.info'),
              content: (
                <BranchInfoTab
                  key={data.id}
                  branch={data}
                  settings={settings.data}
                  canManage={canManage}
                  canEditSettings={canEditSettings}
                  locale={resolveLocale(i18n.language)}
                />
              ),
            },
            {
              value: 'receipt',
              label: t('tabs.receipt'),
              content: (
                <BranchReceiptTab
                  key={data.id}
                  branch={data}
                  settings={settings.data}
                  canEdit={canEditSettings}
                />
              ),
            },
            ...(canManageDevices
              ? [
                  {
                    value: 'devices',
                    label: t('devices:branchTab', { count: devices.data?.length ?? 0 }),
                    content: (
                      <DeviceList
                        devices={devices.data}
                        loading={devices.isPending}
                        error={devices.isError}
                        onRetry={() => void devices.refetch()}
                        showBranch={false}
                        canRevoke
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </Card>
  );
}
