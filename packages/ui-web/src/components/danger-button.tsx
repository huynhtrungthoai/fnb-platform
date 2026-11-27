import { cn } from '../lib/cn';
import { Icon } from './icon';
import { Spinner } from './spinner';

import type { IconName } from './icon';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface DangerButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** `solid` only inside a `ConfirmDialog`; screens use `outline`. */
  variant?: 'outline' | 'solid';
  /** Required: the action is named by an icon as well as by color. */
  icon: IconName;
  loading?: boolean;
  children: ReactNode;
}

/** An action that is hard to undo (deactivate, delete, revoke). Always confirmed first. */
export function DangerButton({
  variant = 'outline',
  icon,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: DangerButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={(disabled ?? false) || loading}
      aria-busy={loading || undefined}
      className={cn(
        'h-control text-control rounded-control inline-flex items-center justify-center gap-2 px-4 font-semibold whitespace-nowrap',
        'duration-fast transition-colors select-none',
        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'solid'
          ? 'bg-danger text-danger-fg hover:opacity-90'
          : 'border-danger bg-bg text-danger-text hover:bg-danger-subtle border',
        className,
      )}
    >
      {loading ? <Spinner size="sm" /> : <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}
