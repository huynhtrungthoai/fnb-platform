import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';

import type { ReactNode } from 'react';

/** One column of a `DataTable`. */
export interface Column<Row> {
  key: string;
  header: string;
  /** Cell content of a row. */
  cell: (row: Row) => ReactNode;
  /** Numbers and dates align right and use tabular figures. */
  align?: 'start' | 'end';
  /** Hidden below `md`, for secondary columns. */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<Row> {
  /** Accessible name of the table. */
  label: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[] | undefined;
  rowKey: (row: Row) => string;
  loading?: boolean;
  /** Shows `ErrorState` with a retry instead of the rows. */
  error?: boolean;
  onRetry?: () => void;
  /** Shown when there are no rows, usually an `EmptyState` with the next step. */
  empty?: ReactNode;
  /** Highlights a row, for example a locked account. */
  rowTone?: (row: Row) => 'default' | 'warning' | 'muted';
  /** Paging under the table. */
  footer?: ReactNode;
}

const LOADING_ROWS = 5;

/** The standard Admin table: loading rows, empty and error states, paging under it. */
export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  loading = false,
  error = false,
  onRetry,
  empty,
  rowTone,
  footer,
}: DataTableProps<Row>) {
  const { t } = useTranslation('common');
  const hiddenOnMobile = (column: Column<Row>) =>
    column.hideOnMobile ? 'hidden md:table-cell' : '';
  const alignment = (column: Column<Row>) =>
    column.align === 'end' ? 'text-right tabular-nums' : 'text-left';

  let body: ReactNode;
  if (error) {
    body = (
      <tr>
        <td colSpan={columns.length}>
          <ErrorState {...(onRetry ? { onRetry } : {})} />
        </td>
      </tr>
    );
  } else if (loading || !rows) {
    body = Array.from({ length: LOADING_ROWS }, (_, index) => (
      <tr key={index} aria-hidden="true">
        <td colSpan={columns.length} className="px-4 py-3">
          <Skeleton shape="row" />
        </td>
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={columns.length}>{empty ?? <EmptyState />}</td>
      </tr>
    );
  } else {
    body = rows.map((row) => {
      const tone = rowTone?.(row) ?? 'default';
      return (
        <tr
          key={rowKey(row)}
          className={cn(
            'border-border border-t',
            tone === 'warning' ? 'bg-warning-subtle' : '',
            tone === 'muted' ? 'text-text-muted' : '',
          )}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={cn(
                'px-4 py-3 align-middle',
                alignment(column),
                hiddenOnMobile(column),
                column.className,
              )}
            >
              {column.cell(row)}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className="border-border bg-bg overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table
          aria-label={label}
          aria-busy={loading || undefined}
          className="text-text w-full text-sm"
        >
          <thead className="bg-bg-subtle text-text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2 text-xs font-semibold whitespace-nowrap',
                    alignment(column),
                    hiddenOnMobile(column),
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {footer ? <div className="border-border border-t px-4 py-3">{footer}</div> : null}
      {loading ? <span className="sr-only">{t('states.loading')}</span> : null}
    </div>
  );
}
