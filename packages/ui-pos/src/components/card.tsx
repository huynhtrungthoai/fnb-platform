import { cn } from '../lib/cn';

import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  /** Controls shown at the end of the header, for example a secondary button. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Content container on a subtle surface, with touch-sized spacing. */
export function Card({ title, actions, className, children }: CardProps) {
  const hasHeader = Boolean(title) || Boolean(actions);
  return (
    <section
      className={cn('border-border bg-bg-subtle rounded-md border p-5 shadow-sm', className)}
    >
      {hasHeader ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-text text-lg font-semibold">{title}</h2> : <span />}
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
