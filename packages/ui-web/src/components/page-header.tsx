import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';

import type { ReactNode } from 'react';

/** One step of the breadcrumb; the last one is the current page and has no link. */
export interface Crumb {
  label: string;
  /** Opens that page; leave out for a section name that is not a page. */
  onSelect?: () => void;
}

export interface PageHeaderProps {
  title: string;
  /** One line under the title. */
  description?: ReactNode;
  breadcrumb?: readonly Crumb[];
  /** The page's actions; at most one `primary` button (docs/ui-rules.md section 5). */
  actions?: ReactNode;
  className?: string;
}

/** Title block at the top of every Admin page. */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation('common');
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label={t('shell.breadcrumb')}>
            <ol className="text-text-muted flex flex-wrap items-center gap-1 text-sm">
              {breadcrumb.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {crumb.onSelect ? (
                    <button
                      type="button"
                      onClick={crumb.onSelect}
                      className="hover:text-text focus-visible:outline-ring rounded-sm underline-offset-2 hover:underline focus-visible:outline-2"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-text text-xl font-bold">{title}</h1>
        {description ? <p className="text-text-muted text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
