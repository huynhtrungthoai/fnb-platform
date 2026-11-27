import { cn } from '../lib/cn';

import type { ReactNode } from 'react';

export interface FormSectionProps {
  title: string;
  description?: string;
  /** Fields laid out in a grid: one column on phones, two from `md`. */
  children: ReactNode;
  className?: string;
}

/** A titled group of fields inside a form. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-3', className)}>
      {/* The legend stays a direct child of the fieldset so it names the group. */}
      <legend className="text-text mb-1 text-base font-semibold">{title}</legend>
      {description ? <p className="text-text-muted text-sm">{description}</p> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export interface FormActionsProps {
  /** The main action, usually a `primary` submit button. */
  primary: ReactNode;
  /** Cancel or a second action, next to the main one. */
  secondary?: ReactNode;
  /** A dangerous action (`DangerButton`), kept on the far side from the main one. */
  danger?: ReactNode;
  className?: string;
}

/** Row of buttons at the end of a form: danger on the left, the main action on the right. */
export function FormActions({ primary, secondary, danger, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4',
        className,
      )}
    >
      <div>{danger ?? null}</div>
      <div className="flex flex-wrap items-center gap-2">
        {secondary ?? null}
        {primary}
      </div>
    </div>
  );
}
