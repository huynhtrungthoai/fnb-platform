import { cva } from 'class-variance-authority';

import { cn } from '../lib/cn';
import { Icon } from './icon';
import { Spinner } from './spinner';

import type { IconName } from './icon';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const buttonStyles = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none',
    'rounded-control duration-fast transition-colors',
    'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'border-border-strong bg-bg text-text hover:bg-bg-muted active:bg-bg-muted border',
        ghost: 'text-text hover:bg-bg-muted active:bg-bg-muted',
      },
      size: {
        // Follows the theme: 40 px in admin, 48 px in the customer theme.
        theme: 'h-control text-control px-4',
        sm: 'h-control-sm px-3 text-sm',
        md: 'h-control-md px-4 text-sm',
        lg: 'h-control-lg px-5 text-base',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
  },
);

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** `primary` is the single main action of a screen. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Leave out to use the default control size of the app's theme. */
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  /** Shows progress and blocks a second click while an action runs. */
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

/** Action button of the Web platform. */
export function Button({
  variant = 'secondary',
  size,
  icon,
  iconPosition = 'start',
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const glyph = loading ? <Spinner size="sm" /> : icon ? <Icon name={icon} size={16} /> : null;
  return (
    <button
      {...rest}
      type={type}
      disabled={(disabled ?? false) || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size: size ?? 'theme', fullWidth }), className)}
    >
      {iconPosition === 'start' ? glyph : null}
      <span>{children}</span>
      {iconPosition === 'end' ? glyph : null}
    </button>
  );
}
