import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Button } from './button';
import { Icon } from './icon';

export interface ErrorStateProps {
  /** Short, already-translated message; defaults to the shared load error. */
  message?: string;
  /** Shows a "Try again" button when given. */
  onRetry?: () => void;
  /** Label of the retry button; defaults to the shared "Try again". */
  retryLabel?: string;
  className?: string;
}

/** Shown when a data area failed to load. Uses an icon and text, never color alone. */
export function ErrorState({ message, onRetry, retryLabel, className }: ErrorStateProps) {
  const { t } = useTranslation('common');
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 p-8 text-center', className)}>
      <span className="size-control-xl bg-danger-subtle text-danger-text inline-flex items-center justify-center rounded-full">
        <Icon name="triangle-alert" size={24} />
      </span>
      <p className="text-text text-lg font-semibold">{t('states.errorTitle')}</p>
      <p className="text-text-muted text-base">{message ?? t('states.errorDescription')}</p>
      {onRetry ? (
        <Button variant="secondary" icon="retry" onClick={onRetry}>
          {retryLabel ?? t('actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}
