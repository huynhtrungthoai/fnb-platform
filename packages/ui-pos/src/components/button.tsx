import { cva } from 'class-variance-authority';

import { cn } from '../lib/cn';
import { Icon } from './icon';
import { Spinner } from './spinner';

import type { IconName } from './icon';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Touch screens have no hover: every variant shows a clear pressed state instead.
const buttonStyles = cva(
  [
    'inline-flex items-center justify-center gap-3 font-semibold whitespace-nowrap select-none',
    'rounded-control duration-fast transition-colors',
    'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg active:bg-primary-active',
        secondary: 'border-border-strong bg-bg text-text active:bg-bg-muted border',
        ghost: 'text-text active:bg-bg-muted',
      },
      size: {
        // 56 px: the POS touch target for selling actions.
        lg: 'h-control text-control px-5',
        // 48 px: secondary actions inside dialogs and lists.
        md: 'h-control-lg px-4 text-base',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
  },
);

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** `primary` is the single main action of a screen and belongs in the `ActionBar`. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** `lg` (56 px) is the default; `md` is 48 px. */
  size?: 'lg' | 'md';
  icon?: IconName;
  /** Shows progress and blocks a second tap while an action runs. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Content at the end of the button, for example the amount to pay. */
  trailing?: ReactNode;
  children: ReactNode;
}

/** Touch button of the POS platform. */
export function Button({
  variant = 'secondary',
  size = 'lg',
  icon,
  loading = false,
  fullWidth = false,
  trailing,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={(disabled ?? false) || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
    >
      {loading ? <Spinner size="sm" /> : icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span>
      {trailing ? <span className="tabular-nums">{trailing}</span> : null}
    </button>
  );
}
