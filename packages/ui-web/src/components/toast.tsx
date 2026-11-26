import { Toast as ToastPrimitive } from 'radix-ui';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconName } from './icon';

/** Meaning of a toast; it sets the color and the icon together. */
export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Already-translated text. */
  message: string;
  /** Optional follow-up such as "Undo". */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

// A tiny external store so `toast()` can be called from event handlers and query callbacks
// without threading a context through every screen.
let items: readonly ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: readonly ToastItem[]): void {
  items = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): readonly ToastItem[] => items;

/** Shows feedback after an action. Requires one `<Toaster />` mounted in the app. */
export function toast(options: ToastOptions): number {
  const id = nextId;
  nextId += 1;
  emit([...items, { ...options, id }]);
  return id;
}

/** Removes a toast early; without an id, removes all of them. */
export function dismissToast(id?: number): void {
  emit(id === undefined ? [] : items.filter((item) => item.id !== id));
}

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-success bg-success-subtle text-success-text',
  danger: 'border-danger bg-danger-subtle text-danger-text',
  info: 'border-info bg-info-subtle text-info-text',
};

const TONE_ICONS: Record<ToastTone, IconName> = {
  success: 'circle-check',
  danger: 'circle-alert',
  info: 'info',
};

const DEFAULT_DURATION_MS = 5000;

/** Renders the toasts raised with `toast()`. Mount once near the root of the app. */
export function Toaster() {
  const { t } = useTranslation('common');
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <ToastPrimitive.Provider duration={DEFAULT_DURATION_MS} label={t('notifications.label')}>
      {current.map((item) => {
        const tone = item.tone ?? 'info';
        return (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                dismissToast(item.id);
              }
            }}
            className={cn(
              'flex items-center gap-3 rounded-md border p-3 text-sm shadow-md',
              TONE_CLASSES[tone],
            )}
          >
            <Icon name={TONE_ICONS[tone]} size={20} />
            <ToastPrimitive.Description className="flex-1">
              {item.message}
            </ToastPrimitive.Description>
            {item.action ? (
              <ToastPrimitive.Action
                altText={item.action.label}
                onClick={item.action.onClick}
                className="focus-visible:outline-ring rounded-sm px-2 py-1 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {item.action.label}
              </ToastPrimitive.Action>
            ) : null}
            <ToastPrimitive.Close
              aria-label={t('actions.close')}
              className="focus-visible:outline-ring inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="x" size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="z-toast max-w-dialog-sm fixed right-4 bottom-4 flex w-full flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
