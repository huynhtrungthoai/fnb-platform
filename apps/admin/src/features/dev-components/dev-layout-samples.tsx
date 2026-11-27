import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Can,
  Card,
  FormActions,
  FormSection,
  Input,
  Menu,
  NoPermission,
  PageHeader,
  PermissionProvider,
  Select,
  Sidebar,
  toast,
} from '@fnb/ui-web';

/** Samples of the Admin frame components: header, menu, select, permission gates, form layout. */
export function DevLayoutSamples() {
  const { t } = useTranslation('dev');
  const [branch, setBranch] = useState('q1');
  const [name, setName] = useState('');

  return (
    <Card title={t('sections.layout')}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('layout.pageTitle')}
          description={t('layout.pageDescription')}
          breadcrumb={[
            { label: t('layout.crumb'), onSelect: () => undefined },
            { label: t('layout.pageTitle') },
          ]}
          actions={
            <Button variant="primary" icon="plus">
              {t('layout.add')}
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="border-border rounded-control border">
            {/* The sample menu only holds `branch.view`, so the staff link is hidden. */}
            <PermissionProvider permissions={['branch.view']}>
              <Sidebar
                label={t('layout.menu')}
                activeKey="branches"
                groups={[
                  {
                    key: 'system',
                    label: t('layout.crumb'),
                    items: [
                      {
                        key: 'branches',
                        label: t('layout.pageTitle'),
                        icon: 'store',
                        href: '#branches',
                        permission: 'branch.view',
                      },
                      {
                        key: 'staff',
                        label: t('layout.hidden'),
                        icon: 'users',
                        href: '#staff',
                        permission: 'user.view',
                      },
                    ],
                  },
                ]}
                onNavigate={() => undefined}
              />
            </PermissionProvider>
          </div>
          <div className="flex flex-col gap-4">
            <Select
              label={t('layout.select')}
              value={branch}
              onChange={setBranch}
              options={[
                { value: 'q1', label: t('layout.optionOne'), description: 'Q1' },
                { value: 'q3', label: t('layout.optionTwo'), description: 'Q3' },
              ]}
            />
            <div>
              <Menu
                align="start"
                trigger={<Button icon="more">{t('layout.menuButton')}</Button>}
                items={[
                  {
                    key: 'edit',
                    label: t('layout.menuEdit'),
                    icon: 'edit',
                    onSelect: () => toast({ message: t('layout.menuEdit') }),
                  },
                  {
                    key: 'delete',
                    label: t('layout.menuDelete'),
                    icon: 'trash',
                    tone: 'danger',
                    onSelect: () => toast({ tone: 'danger', message: t('layout.menuDelete') }),
                  },
                ]}
              />
            </div>
            <PermissionProvider permissions={[]}>
              <Can
                permission="branch.manage"
                fallback={<NoPermission permission="branch.manage" />}
              >
                <span />
              </Can>
            </PermissionProvider>
          </div>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <FormSection title={t('layout.formSection')} description={t('layout.formDescription')}>
            <Input label={t('layout.branchName')} value={name} onChange={setName} />
            <Input label={t('layout.branchCode')} value="Q1" onChange={() => undefined} />
          </FormSection>
          <FormActions
            primary={
              <Button type="submit" variant="primary">
                {t('layout.save')}
              </Button>
            }
            secondary={<Button>{t('layout.cancel')}</Button>}
          />
        </form>
      </div>
    </Card>
  );
}
