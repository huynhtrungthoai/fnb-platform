import { useId } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'prefix'
> {
  /** Visible label; every control has one. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Help text under the field. */
  hint?: string;
  /** Error message; shown with an icon so the state does not rely on color. */
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/** Single-line text field sized for touch (56 px), with label, hint and error state. */
export function Input({
  label,
  value,
  onChange,
  hint,
  error,
  prefix,
  suffix,
  disabled,
  className,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasError = Boolean(error);
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-text text-base font-medium">
        {label}
      </label>
      <div
        className={cn(
          'h-control rounded-control bg-bg flex items-center gap-3 border px-4',
          'focus-within:outline-ring focus-within:outline-2 focus-within:outline-offset-2',
          hasError ? 'border-danger' : 'border-border-strong',
          disabled ? 'opacity-50' : '',
        )}
      >
        {prefix ? <span className="text-text-muted">{prefix}</span> : null}
        <input
          {...rest}
          id={inputId}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="text-control text-text placeholder:text-text-subtle h-full min-w-0 flex-1 bg-transparent outline-none"
        />
        {suffix ? <span className="text-text-muted">{suffix}</span> : null}
      </div>
      {message ? (
        <p
          id={messageId}
          className={cn(
            'flex items-center gap-2 text-base',
            hasError ? 'text-danger-text' : 'text-text-muted',
          )}
        >
          {hasError ? <Icon name="circle-alert" size={20} /> : null}
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
