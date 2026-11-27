import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Pages to show: the first, the last, and two around the current one; `null` is a gap. */
function pageList(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) {
      result.push(null);
    }
    result.push(value);
  });
  return result;
}

/** "Showing 1–20 of 31" with page buttons, under a `DataTable`. */
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const { t } = useTranslation('common');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const buttonClass =
    'size-control-sm rounded-control inline-flex items-center justify-center text-sm tabular-nums focus-visible:outline-ring focus-visible:outline-2 disabled:opacity-50 disabled:pointer-events-none';

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-text-muted text-sm">{t('pagination.summary', { from, to, total })}</p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t('pagination.previous')}
            disabled={page <= 1}
            onClick={() => {
              onChange(page - 1);
            }}
            className={cn(buttonClass, 'hover:bg-bg-muted')}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          {pageList(page, totalPages).map((value, index) =>
            value === null ? (
              <span key={`gap-${index}`} className="text-text-subtle px-1" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={value}
                type="button"
                aria-current={value === page ? 'page' : undefined}
                onClick={() => {
                  onChange(value);
                }}
                className={cn(
                  buttonClass,
                  value === page
                    ? 'bg-primary-subtle text-primary-text font-semibold'
                    : 'text-text hover:bg-bg-muted',
                )}
              >
                {value}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label={t('pagination.next')}
            disabled={page >= totalPages}
            onClick={() => {
              onChange(page + 1);
            }}
            className={cn(buttonClass, 'hover:bg-bg-muted')}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
