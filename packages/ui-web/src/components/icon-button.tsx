import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconName } from './icon';
import type { ButtonHTMLAttributes } from 'react';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  icon: IconName;
  /** Required accessible name, since there is no visible text. */
  label: string;
  variant?: 'ghost' | 'outline';
}

/** A button that shows only an icon (row actions, toolbars). */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'size-control-sm rounded-control text-text-muted inline-flex shrink-0 items-center justify-center',
        'hover:bg-bg-muted hover:text-text focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'outline' ? 'border-border-strong bg-bg border' : '',
        className,
      )}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}
