import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { Icon } from './icon';

import type { ReactNode } from 'react';

export interface FilterBarProps {
  /** The search box; leave out for lists without text search. */
  search?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Other filters, usually `Select`s with hidden labels. */
  children?: ReactNode;
  /** True when any filter differs from its default: shows "Clear filters". */
  isFiltered: boolean;
  onClear: () => void;
}

/** Row of filters above a `DataTable`. */
export function FilterBar({ search, children, isFiltered, onClear }: FilterBarProps) {
  const { t } = useTranslation('common');
  return (
    <div role="search" className="flex flex-wrap items-end gap-3">
      {search ? (
        <label className="h-control rounded-control border-border-strong bg-bg focus-within:outline-ring flex min-w-64 flex-1 items-center gap-2 border px-3 focus-within:outline-2 focus-within:outline-offset-2">
          <Icon name="search" size={16} className="text-text-muted" />
          <span className="sr-only">{search.label}</span>
          <input
            type="search"
            value={search.value}
            placeholder={search.placeholder}
            onChange={(event) => {
              search.onChange(event.target.value);
            }}
            className="text-control text-text placeholder:text-text-subtle h-full min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
      ) : null}
      {children}
      {isFiltered ? (
        <Button variant="ghost" icon="x" onClick={onClear}>
          {t('actions.clearFilters')}
        </Button>
      ) : null}
    </div>
  );
}
