import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { useId } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { ReactNode } from 'react';

export interface CheckboxProps {
  /** `indeterminate` for a group where only some items are ticked. */
  checked: boolean | 'indeterminate';
  onChange: (checked: boolean) => void;
  /** Visible label; with `hideLabel` it only names the box for screen readers. */
  label: ReactNode;
  hideLabel?: boolean;
  /** Second line under the label. */
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A tick box with its label; the whole row is the touch target. */
export function Checkbox({
  checked,
  onChange,
  label,
  hideLabel = false,
  description,
  disabled = false,
  className,
}: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', disabled ? 'opacity-60' : '', className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => {
          onChange(value === true);
        }}
        className={cn(
          'border-border-strong bg-bg mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg',
          'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-fg',
          'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Icon name={checked === 'indeterminate' ? 'minus' : 'check'} size={16} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label
        htmlFor={id}
        className={cn('flex min-w-0 flex-col gap-0.5', hideLabel ? 'sr-only' : '')}
      >
        <span className="text-text text-sm">{label}</span>
        {description ? <span className="text-text-muted text-xs">{description}</span> : null}
      </label>
    </div>
  );
}
