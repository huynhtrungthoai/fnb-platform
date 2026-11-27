import { Select as SelectPrimitive } from 'radix-ui';
import { useId } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './icon';

/** One choice of a `Select`. */
export interface SelectOption {
  value: string;
  label: string;
  /** Second line in the list, for example a branch code. */
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Every control has a label; `hideLabel` keeps it for screen readers only. */
  label: string;
  hideLabel?: boolean;
  options: readonly SelectOption[];
  /** Empty string: nothing chosen yet, the placeholder shows. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Pick one value from a short list (branch, group, status). */
export function Select({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  placeholder,
  hint,
  error,
  disabled,
  className,
}: SelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span id={labelId} className={cn('text-text text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </span>
      <SelectPrimitive.Root
        value={value.length > 0 ? value : undefined}
        onValueChange={onChange}
        {...(disabled === undefined ? {} : { disabled })}
      >
        <SelectPrimitive.Trigger
          aria-labelledby={labelId}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'h-control rounded-control bg-bg text-control text-text flex items-center justify-between gap-2 border px-3',
            'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
            'data-[placeholder]:text-text-subtle disabled:opacity-50',
            hasError ? 'border-danger' : 'border-border-strong',
          )}
        >
          <span className="truncate">
            <SelectPrimitive.Value {...(placeholder ? { placeholder } : {})} />
          </span>
          <SelectPrimitive.Icon className="text-text-muted">
            <Icon name="chevrons-up-down" size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-popover rounded-control border-border bg-bg text-text max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden border shadow-md"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  {...(option.disabled === undefined ? {} : { disabled: option.disabled })}
                  className={cn(
                    'rounded-control flex cursor-default items-center gap-2 px-3 py-2 text-sm outline-none select-none',
                    'data-[highlighted]:bg-bg-muted data-[disabled]:opacity-50',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    {option.description ? (
                      <span className="text-text-muted text-xs">{option.description}</span>
                    ) : null}
                  </span>
                  <SelectPrimitive.ItemIndicator className="text-primary-text">
                    <Icon name="check" size={16} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {message ? (
        <p
          id={messageId}
          className={cn(
            'flex items-center gap-1 text-sm',
            hasError ? 'text-danger-text' : 'text-text-muted',
          )}
        >
          {hasError ? <Icon name="circle-alert" size={16} /> : null}
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
