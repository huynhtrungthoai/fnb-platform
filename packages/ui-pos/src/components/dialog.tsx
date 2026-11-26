import { Dialog as DialogPrimitive } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Action buttons, shown at the bottom right. */
  footer?: ReactNode;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-dialog-sm',
  md: 'max-w-dialog-md',
  lg: 'max-w-dialog-lg',
};

/** Modal dialog for touch screens. Traps focus while open; the close target is 44 px. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
}: DialogProps) {
  const { t } = useTranslation('common');
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-dialog bg-overlay fixed inset-0 grid place-items-center overflow-y-auto p-4">
          <DialogPrimitive.Content
            // Radix warns when no description is linked; opt out explicitly when there is none.
            {...(description ? {} : { 'aria-describedby': undefined })}
            className={cn(
              'bg-bg text-text relative w-full rounded-lg p-6 shadow-lg outline-none',
              SIZE_CLASSES[size],
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <DialogPrimitive.Title className="text-xl font-semibold">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-text-muted text-base">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              <DialogPrimitive.Close
                aria-label={t('actions.close')}
                className="size-touch-min text-text-muted focus-visible:outline-ring active:bg-bg-muted inline-flex shrink-0 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Icon name="x" size={24} />
              </DialogPrimitive.Close>
            </div>
            {children}
            {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
