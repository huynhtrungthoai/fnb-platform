import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconSize } from './icon';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible name; defaults to the shared "Loading" label. */
  label?: string;
  className?: string;
}

const ICON_SIZES: Record<NonNullable<SpinnerProps['size']>, IconSize> = { sm: 16, md: 20, lg: 24 };

/** Progress indicator for an action in flight. Use `Skeleton` for content that is loading. */
export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const { t } = useTranslation('common');
  return (
    <span
      role="status"
      aria-label={label ?? t('states.loading')}
      className={cn('inline-flex', className)}
    >
      <Icon name="loader" size={ICON_SIZES[size]} className="animate-spin" />
    </span>
  );
}
