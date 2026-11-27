import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMe, useUser } from '@fnb/api-client';
import { Card, ErrorState, PageHeader, Skeleton, Tabs, usePermission } from '@fnb/ui-web';

import { StaffAccessTab } from './staff-access-tab';
import { UserAvatar, UserStatusBadge } from './staff-badges';
import { StaffInfoTab } from './staff-info-tab';
import { StaffLoginTab } from './staff-login-tab';

export interface StaffDetailPageProps {
  userId: string;
  onBack: () => void;
}

/** One staff member: details, access per branch, sign-in and PIN. */
export function StaffDetailPage({ userId, onBack }: StaffDetailPageProps) {
  const { t } = useTranslation(['staff', 'admin']);
  const [tab, setTab] = useState('access');
  const me = useMe();
  const user = useUser(userId);
  const canManage = usePermission('user.manage');
  const canReset = usePermission('user.reset_credentials');
  const isSelf = me.data?.user.id === userId;

  if (user.isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void user.refetch()} />
      </Card>
    );
  }
  if (!user.data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="line" />
        <Skeleton shape="rect" />
      </div>
    );
  }
  const data = user.data;

  return (
    <>
      <PageHeader
        title={data.fullName}
        breadcrumb={[
          { label: t('admin:nav.groups.people') },
          { label: t('detail.breadcrumb'), onSelect: onBack },
          { label: data.fullName },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <UserAvatar fullName={data.fullName} />
            <code>{data.username}</code>
            <UserStatusBadge user={data} />
          </span>
        }
      />
      <Card>
        <Tabs
          label={t('detail.tabs.label')}
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'info',
              label: t('detail.tabs.info'),
              content: <StaffInfoTab user={data} canManage={canManage && !isSelf} />,
            },
            {
              value: 'access',
              label: t('detail.tabs.access'),
              content: <StaffAccessTab user={data} isSelf={isSelf} />,
            },
            {
              value: 'login',
              label: t('detail.tabs.login'),
              content: <StaffLoginTab user={data} canReset={canReset} isSelf={isSelf} />,
            },
          ]}
        />
      </Card>
    </>
  );
}
