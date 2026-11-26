import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button, Card } from '@fnb/ui-web';

import { changeLocale } from '../../lib/i18n';
import { SettingsBar } from '../../shared-components/settings-bar';

/** Placeholder landing screen of the scaffold; replaced by login and the dashboard in M1. */
export function HomePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <main className="max-w-content-max mx-auto flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-text text-2xl font-bold">{t('app.admin')}</h1>
        <SettingsBar onLocaleChange={(locale) => void changeLocale(locale)} />
      </header>
      <Card>
        <p className="text-text-muted mb-4">{t('app.scaffoldReady')}</p>
        {import.meta.env.DEV ? (
          <Button
            variant="primary"
            icon="chevron-right"
            iconPosition="end"
            onClick={() => void navigate({ to: '/dev/components' })}
          >
            {t('app.openComponents')}
          </Button>
        ) : null}
      </Card>
    </main>
  );
}
