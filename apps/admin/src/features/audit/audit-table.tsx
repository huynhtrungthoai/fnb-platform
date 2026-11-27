import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuditLogs, useMe } from '@fnb/api-client';
import { formatDateTime, resolveLocale } from '@fnb/i18n';
import { Button, DataTable, EmptyState, Pagination } from '@fnb/ui-web';

import { AuditDetailDialog } from './audit-detail-dialog';
import { describeTarget, isAuditAction } from './audit-format';

import type { AuditLog, AuditLogQuery } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

const PAGE_SIZE = 20;

export interface AuditTableProps {
  /** Filters without paging; the table pages by itself. */
  query: Partial<Omit<AuditLogQuery, 'page' | 'pageSize'>>;
  emptyText?: string;
}

/** Audit events, newest first, with a detail dialog per row. */
export function AuditTable({ query, emptyText }: AuditTableProps) {
  const { t, i18n } = useTranslation('audit');
  const locale = resolveLocale(i18n.language);
  const me = useMe();
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<AuditLog | null>(null);
  const [lastQuery, setLastQuery] = useState(query);
  if (JSON.stringify(lastQuery) !== JSON.stringify(query)) {
    // New filters start again from the first page.
    setLastQuery(query);
    setPage(1);
  }
  const logs = useAuditLogs({ ...query, page, pageSize: PAGE_SIZE });
  const branchName = (branchId: string | null) =>
    branchId === null
      ? t('businessLevel')
      : ((me.data?.branches ?? []).find((entry) => entry.branch.id === branchId)?.branch.name ??
        '');

  const columns: Column<AuditLog>[] = [
    {
      key: 'time',
      header: t('columns.time'),
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateTime(row.occurredAt, locale)}
        </span>
      ),
    },
    {
      key: 'actor',
      header: t('columns.actor'),
      cell: (row) => row.actorName ?? (row.actorUserId ? t('unknownActor') : t('system')),
    },
    {
      key: 'branch',
      header: t('columns.branch'),
      hideOnMobile: true,
      cell: (row) => branchName(row.branchId),
    },
    {
      key: 'action',
      header: t('columns.action'),
      cell: (row) => (
        <span className="flex flex-col">
          <span>{isAuditAction(row.action) ? t(`actions.${row.action}`) : row.action}</span>
          <code className="text-text-subtle text-xs">{row.action}</code>
        </span>
      ),
    },
    { key: 'entity', header: t('columns.entity'), cell: (row) => describeTarget(row) },
    {
      key: 'open',
      header: '',
      align: 'end',
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpened(row);
          }}
        >
          {t('detail.open')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        label={t('tableLabel')}
        columns={columns}
        rows={logs.data?.data}
        rowKey={(row) => row.id}
        loading={logs.isPending}
        error={logs.isError}
        onRetry={() => void logs.refetch()}
        empty={<EmptyState description={emptyText ?? t('empty')} />}
        footer={
          logs.data ? (
            <Pagination
              page={logs.data.meta.page}
              pageSize={logs.data.meta.pageSize}
              total={logs.data.meta.total}
              onChange={setPage}
            />
          ) : null
        }
      />
      <AuditDetailDialog
        row={opened}
        onClose={() => {
          setOpened(null);
        }}
      />
    </>
  );
}
