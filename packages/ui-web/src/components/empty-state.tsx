import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Defaults to the shared "nothing here yet" title. */
  title?: string;
  /** One line that explains why the area is empty. */
  description?: string;
  /** The next step, usually a button. */
  action?: ReactNode;
  className?: string;
}

/** Shown when a data area has nothing to list. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  const { t } = useTranslation('common');
  return (
    <div className={cn('flex flex-col items-center gap-3 p-8 text-center', className)}>
      <span className="size-control-lg bg-bg-muted text-text-muted inline-flex items-center justify-center rounded-full">
        <Icon name="inbox" size={24} />
      </span>
      <p className="text-text text-base font-semibold">{title ?? t('states.emptyTitle')}</p>
      {description ? <p className="text-text-muted text-sm">{description}</p> : null}
      {action ?? null}
    </div>
  );
}
