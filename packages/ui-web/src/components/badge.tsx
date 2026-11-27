import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconName } from './icon';
import type { ReactNode } from 'react';

/** Meaning of a badge; it sets the color. */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-bg-muted text-text-muted',
  primary: 'bg-primary-subtle text-primary-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
  info: 'bg-info-subtle text-info-text',
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** A status always shows an icon too, so it never relies on color alone. */
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** Small label: a status, a tag, a count. */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  );
}
