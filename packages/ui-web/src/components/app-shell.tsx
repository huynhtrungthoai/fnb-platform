import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { MouseEvent, ReactNode } from 'react';

export interface AppShellProps {
  /** The main menu, usually a `Sidebar`. */
  sidebar: ReactNode;
  /** Right side of the top bar: branch picker, language, appearance, account. */
  topbar: ReactNode;
  children: ReactNode;
}

/**
 * Frame of every Admin page: menu on the left, top bar, content up to the maximum width.
 * Below the `lg` breakpoint the menu folds into a drawer opened from the top bar.
 */
export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  const { t } = useTranslation('common');
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [isDrawerOpen]);

  // Following a menu link closes the drawer.
  const closeOnLink = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      setDrawerOpen(false);
    }
  };

  return (
    <div className="bg-bg-subtle text-text flex min-h-dvh">
      <aside className="w-sidebar border-border bg-bg sticky top-0 hidden h-dvh shrink-0 border-r lg:block">
        {sidebar}
      </aside>

      {isDrawerOpen ? (
        <div className="z-drawer fixed inset-0 lg:hidden">
          <button
            type="button"
            aria-label={t('shell.closeMenu')}
            className="bg-overlay absolute inset-0"
            onClick={() => {
              setDrawerOpen(false);
            }}
          />
          {/* Delegated click handler: closes the drawer when a menu link inside is followed. */}
          <div
            className="w-sidebar bg-bg absolute inset-y-0 left-0 shadow-lg"
            onClick={closeOnLink}
          >
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-sticky border-border bg-bg sticky top-0 flex items-center gap-3 border-b px-4 py-2">
          <button
            type="button"
            aria-label={t('shell.openMenu')}
            aria-expanded={isDrawerOpen}
            onClick={() => {
              setDrawerOpen(true);
            }}
            className="size-control-sm rounded-control text-text-muted hover:bg-bg-muted focus-visible:outline-ring inline-flex items-center justify-center focus-visible:outline-2 lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className={cn('flex flex-1 flex-wrap items-center justify-end gap-3')}>{topbar}</div>
        </header>
        <main className="max-w-content-max mx-auto flex w-full flex-1 flex-col gap-6 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
