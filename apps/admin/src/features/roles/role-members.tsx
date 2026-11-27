import { useTranslation } from 'react-i18next';

import { useUsers } from '@fnb/api-client';
import { DataTable, EmptyState } from '@fnb/ui-web';

import type { UserWithAssignments } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

/** Members of a group are few; one page covers them. */
const MEMBERS_PAGE_SIZE = 100;

/** Staff in a group, with the branches where they hold it. */
export function RoleMembers({ roleId }: { roleId: string }) {
  const { t } = useTranslation(['roles', 'staff']);
  const users = useUsers({ roleId, pageSize: MEMBERS_PAGE_SIZE, status: 'all' });
  const columns: Column<UserWithAssignments>[] = [
    {
      key: 'name',
      header: t('members.name'),
      cell: (user) => <span className="font-semibold">{user.fullName}</span>,
    },
    {
      key: 'username',
      header: t('members.username'),
      cell: (user) => <code className="text-text-muted">{user.username}</code>,
    },
    {
      key: 'branch',
      header: t('members.branch'),
      cell: (user) =>
        user.assignments
          .filter((assignment) => assignment.role.id === roleId)
          .map((assignment) => assignment.branch?.name ?? t('staff:allBranches'))
          .join(', '),
    },
  ];
  return (
    <DataTable
      label={t('edit.membersLabel')}
      columns={columns}
      rows={users.data?.data}
      rowKey={(user) => user.id}
      loading={users.isPending}
      error={users.isError}
      onRetry={() => void users.refetch()}
      empty={<EmptyState description={t('edit.membersEmpty')} />}
    />
  );
}
