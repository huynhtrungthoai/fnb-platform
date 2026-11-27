import { changeLocale } from '../../lib/i18n';
import { SettingsBar } from '../../shared-components/settings-bar';

import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Centered card of the screens before the Admin shell: sign in, temporary PIN. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="bg-bg-subtle text-text flex min-h-dvh flex-col">
      <header className="flex justify-end p-4">
        <SettingsBar onLocaleChange={(locale) => void changeLocale(locale)} />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <section
          aria-labelledby="auth-title"
          className="max-w-dialog-sm border-border bg-bg flex w-full flex-col gap-6 rounded-lg border p-6 shadow-md"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <img src="/logo-icon.png" alt="" className="size-control-xl" />
            <h1 id="auth-title" className="text-xl font-bold">
              {title}
            </h1>
            {description ? <p className="text-text-muted text-sm">{description}</p> : null}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
