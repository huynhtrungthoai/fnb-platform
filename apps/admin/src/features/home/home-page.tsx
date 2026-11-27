import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useMe } from '@fnb/api-client';
import { localize, resolveLocale } from '@fnb/i18n';
import { Button, Card, EmptyState, PageHeader } from '@fnb/ui-web';

import { resolveWorkingAccess } from '../../lib/access';
import { useSelectedBranchId } from '../../lib/branch-store';

/** Overview of the Admin. Sales figures and charts arrive with the POS (M3) and reports (M7). */
export function HomePage() {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const me = useMe();
  const access = resolveWorkingAccess(me.data, useSelectedBranchId());
  const locale = resolveLocale(i18n.language);

  return (
    <>
      <PageHeader
        title={t('home.title')}
        description={t('home.greeting', { name: me.data?.user.fullName ?? '' })}
      />
      <Card>
        {access.current ? (
          <div className="flex flex-col gap-2">
            <p className="text-text">
              {t('home.role', {
                branch: access.current.branch.name,
                role: localize(access.current.role.name, locale),
              })}
            </p>
            <p className="text-text-muted text-sm">{t('home.description')}</p>
          </div>
        ) : (
          <EmptyState description={t('home.noAssignment')} />
        )}
      </Card>
      {import.meta.env.DEV ? (
        <div>
          <Button
            variant="ghost"
            icon="chevron-right"
            iconPosition="end"
            onClick={() => void navigate({ to: '/dev/components' })}
          >
            {t('common:app.openComponents')}
          </Button>
        </div>
      ) : null}
    </>
  );
}
