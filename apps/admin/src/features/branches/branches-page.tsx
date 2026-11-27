import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBranches } from '@fnb/api-client';
import { Button, Can, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@fnb/ui-web';

import { BranchDetail } from './branch-detail';
import { BranchList } from './branch-list';
import { CreateBranchDialog } from './create-branch-dialog';

export interface BranchesPageProps {
  /** Branch opened on the right, from the URL; the first one when missing. */
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

/** HT1 Branches (CORE-01, CORE-02): the list on the left, the chosen branch on the right. */
export function BranchesPage({ selectedId, onSelect }: BranchesPageProps) {
  const { t } = useTranslation(['branches', 'admin']);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const branches = useBranches({ status: 'all' });
  const rows = branches.data ?? [];
  const activeCount = rows.filter((branch) => branch.isActive).length;
  const currentId = rows.find((branch) => branch.id === selectedId)?.id ?? rows[0]?.id ?? null;

  const addButton = (
    <Can permission="branch.manage">
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
        breadcrumb={[{ label: t('admin:nav.groups.system') }, { label: t('title') }]}
        {...(branches.data ? { description: t('description', { count: activeCount }) } : {})}
        actions={addButton}
      />
      {branches.isError ? (
        <Card>
          <ErrorState onRetry={() => void branches.refetch()} />
        </Card>
      ) : !branches.data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton shape="rect" />
          <Skeleton shape="rect" className="lg:col-span-2" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title={t('empty')} description={t('emptyAction')} action={addButton} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <BranchList branches={rows} selectedId={currentId} onSelect={onSelect} />
          <div className="lg:col-span-2">
            {currentId ? <BranchDetail key={currentId} branchId={currentId} /> : null}
          </div>
        </div>
      )}
      <CreateBranchDialog
        open={isCreateOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
        onCreated={(branch) => {
          setCreateOpen(false);
          onSelect(branch.id);
        }}
      />
    </>
  );
}
