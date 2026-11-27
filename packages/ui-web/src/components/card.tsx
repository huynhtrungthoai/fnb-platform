import { cn } from '../lib/cn';

import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  /** Controls shown at the end of the header, for example a secondary button. */
  actions?: ReactNode;
  /** `none` for content that runs to the edges, such as a list or a table. */
  padding?: 'md' | 'none';
  className?: string;
  children?: ReactNode;
}

/** Content container on a subtle surface. */
export function Card({ title, actions, padding = 'md', className, children }: CardProps) {
  const hasHeader = Boolean(title) || Boolean(actions);
  return (
    <section
      className={cn(
        'border-border bg-bg-subtle rounded-md border shadow-sm',
        padding === 'md' ? 'p-4' : 'overflow-hidden',
        className,
      )}
    >
      {hasHeader ? (
        <header
          className={cn(
            'flex items-center justify-between gap-3',
            padding === 'md' ? 'mb-3' : 'border-border border-b px-4 py-3',
          )}
        >
          {title ? <h2 className="text-text text-base font-semibold">{title}</h2> : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
