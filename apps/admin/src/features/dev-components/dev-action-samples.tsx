import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Card, ConfirmDialog, DangerButton, IconButton, Tabs, toast } from '@fnb/ui-web';

/** Samples of badges, tabs and the confirm flow for actions that are hard to undo. */
export function DevActionSamples() {
  const { t } = useTranslation('dev');
  const [tab, setTab] = useState('one');
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card title={t('sections.actions')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t('actions.neutral')}</Badge>
          <Badge tone="success" icon="check">
            {t('actions.success')}
          </Badge>
          <Badge tone="warning" icon="triangle-alert">
            {t('actions.warning')}
          </Badge>
          <Badge tone="danger" icon="lock">
            {t('actions.danger')}
          </Badge>
          <Badge tone="info" icon="info">
            {t('actions.info')}
          </Badge>
          <IconButton icon="edit" label={t('actions.edit')} />
          <IconButton icon="more" label={t('actions.more')} variant="outline" />
        </div>
        <Tabs
          label={t('sections.actions')}
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'one',
              label: t('actions.tabOne'),
              content: <p className="text-text-muted text-sm">{t('actions.tabOneBody')}</p>,
            },
            {
              value: 'two',
              label: t('actions.tabTwo'),
              content: <p className="text-text-muted text-sm">{t('actions.tabTwoBody')}</p>,
            },
          ]}
        />
        <div>
          <DangerButton
            icon="ban"
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            {t('actions.deactivate')}
          </DangerButton>
        </div>
        <ConfirmDialog
          open={isConfirmOpen}
          onClose={() => {
            setConfirmOpen(false);
          }}
          onConfirm={() => {
            setConfirmOpen(false);
            toast({ tone: 'success', message: t('actions.done') });
          }}
          tone="danger"
          confirmIcon="ban"
          title={t('actions.confirmTitle')}
          description={t('actions.confirmDescription')}
          confirmLabel={t('actions.deactivate')}
          reasonRequired
        />
      </div>
    </Card>
  );
}
