import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Spinner,
  toast,
} from '@fnb/ui-web';

import { SettingsBar } from '../../shared-components/settings-bar';
import { DevLayoutSamples } from './dev-layout-samples';

import type { Locale } from '@fnb/contract';

/** Role colors shown as swatches. Class names are written out so Tailwind can find them. */
const COLOR_SWATCHES = [
  { token: 'bg', className: 'bg-bg text-text' },
  { token: 'bg-subtle', className: 'bg-bg-subtle text-text' },
  { token: 'bg-muted', className: 'bg-bg-muted text-text-muted' },
  { token: 'primary', className: 'bg-primary text-primary-fg' },
  { token: 'primary-subtle', className: 'bg-primary-subtle text-primary-text' },
  { token: 'accent', className: 'bg-accent text-accent-fg' },
  { token: 'accent-subtle', className: 'bg-accent-subtle text-accent-text' },
  { token: 'success', className: 'bg-success text-success-fg' },
  { token: 'success-subtle', className: 'bg-success-subtle text-success-text' },
  { token: 'warning', className: 'bg-warning text-warning-fg' },
  { token: 'warning-subtle', className: 'bg-warning-subtle text-warning-text' },
  { token: 'danger', className: 'bg-danger text-danger-fg' },
  { token: 'danger-subtle', className: 'bg-danger-subtle text-danger-text' },
  { token: 'info', className: 'bg-info text-info-fg' },
  { token: 'info-subtle', className: 'bg-info-subtle text-info-text' },
] as const;

export interface DevComponentsPageProps {
  onLocaleChange: (locale: Locale) => void;
}

/**
 * Development-only sample page (plans/03-design-system.md section 7.5): the Web component set
 * in the admin theme, with switches for light/dark and vi/en. Used instead of Storybook.
 */
export function DevComponentsPage({ onLocaleChange }: DevComponentsPageProps) {
  const { t } = useTranslation('dev');
  const [name, setName] = useState('');
  const [code, setCode] = useState('HD-002');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <main className="max-w-content-max mx-auto flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-text text-2xl font-bold">{t('title')}</h1>
        <p className="text-text-muted">{t('subtitle')}</p>
      </header>

      <Card title={t('sections.settings')}>
        <SettingsBar onLocaleChange={onLocaleChange} />
      </Card>

      <Card title={t('sections.colors')}>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {COLOR_SWATCHES.map((swatch) => (
            <li
              key={swatch.token}
              className={`border-border rounded-sm border p-3 font-mono text-xs ${swatch.className}`}
            >
              {swatch.token}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('sections.buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{t('buttons.primary')}</Button>
          <Button variant="secondary">{t('buttons.secondary')}</Button>
          <Button variant="ghost">{t('buttons.ghost')}</Button>
          <Button variant="primary" icon="plus">
            {t('buttons.withIcon')}
          </Button>
          <Button variant="primary" loading>
            {t('buttons.loading')}
          </Button>
          <Button disabled>{t('buttons.disabled')}</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">{t('buttons.small')}</Button>
          <Button size="md">{t('buttons.medium')}</Button>
          <Button size="lg">{t('buttons.large')}</Button>
        </div>
      </Card>

      <Card title={t('sections.inputs')}>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label={t('inputs.nameLabel')}
            value={name}
            onChange={setName}
            placeholder={t('inputs.namePlaceholder')}
            hint={t('inputs.nameHint')}
          />
          <Input
            label={t('inputs.codeLabel')}
            value={code}
            onChange={setCode}
            error={t('inputs.codeError')}
          />
          <Input label={t('inputs.disabledLabel')} value="" onChange={setName} disabled />
        </div>
      </Card>

      <Card title={t('cards.title')} actions={<Button size="sm">{t('cards.action')}</Button>}>
        <p className="text-text-muted">{t('cards.body')}</p>
      </Card>

      <Card title={t('sections.feedback')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setIsDialogOpen(true);
            }}
          >
            {t('feedback.openDialog')}
          </Button>
          <Button onClick={() => toast({ tone: 'success', message: t('feedback.successMessage') })}>
            {t('feedback.showSuccess')}
          </Button>
          <Button onClick={() => toast({ tone: 'danger', message: t('feedback.errorMessage') })}>
            {t('feedback.showError')}
          </Button>
          <Spinner label={t('feedback.spinner')} />
        </div>
        <div className="mt-4 flex flex-col gap-2" aria-label={t('feedback.skeleton')}>
          <Skeleton shape="line" />
          <Skeleton shape="row" />
          <Skeleton shape="rect" />
        </div>
      </Card>

      <Card title={t('sections.states')}>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            description={t('states.emptyDescription')}
            action={
              <Button variant="primary" icon="plus">
                {t('states.emptyAction')}
              </Button>
            }
          />
          <ErrorState onRetry={() => toast({ tone: 'info', message: t('states.retried') })} />
        </div>
      </Card>

      <DevLayoutSamples />

      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
        }}
        title={t('feedback.dialogTitle')}
        description={t('feedback.dialogDescription')}
        size="sm"
      >
        <p className="text-text-muted">{t('feedback.dialogBody')}</p>
      </Dialog>
    </main>
  );
}
