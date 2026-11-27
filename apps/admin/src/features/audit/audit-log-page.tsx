import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMe, useUsers } from '@fnb/api-client';
import { FilterBar, Input, PageHeader, Select, usePermission } from '@fnb/ui-web';

import { AUDIT_GROUPS } from './audit-format';
import { AuditTable } from './audit-table';

import type { AuditGroup } from './audit-format';

/** Start of a calendar day typed in a date field, in the browser's time zone, as ISO. */
function startOfDay(date: string): string | undefined {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}

/** End of a calendar day typed in a date field, in the browser's time zone, as ISO. */
function endOfDay(date: string): string | undefined {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
}

/** HT9 Activity log (CORE-41): filter by person, type, scope and dates; open an event. */
export function AuditLogPage() {
  const { t } = useTranslation(['audit', 'admin']);
  const me = useMe();
  const canViewUsers = usePermission('user.view');
  const people = useUsers({ pageSize: 100, status: 'all' }, { enabled: canViewUsers });
  const [actor, setActor] = useState('');
  const [group, setGroup] = useState<AuditGroup | ''>('');
  const [scope, setScope] = useState<'branch' | 'business'>('branch');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const isFiltered = actor !== '' || group !== '' || scope !== 'branch' || from !== '' || to !== '';
  const fromIso = startOfDay(from);
  const toIso = endOfDay(to);

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumb={[{ label: t('admin:nav.groups.system') }, { label: t('title') }]}
      />
      <FilterBar
        isFiltered={isFiltered}
        onClear={() => {
          setActor('');
          setGroup('');
          setScope('branch');
          setFrom('');
          setTo('');
        }}
      >
        {canViewUsers ? (
          <Select
            label={t('filters.actor')}
            hideLabel
            value={actor === '' ? 'all' : actor}
            onChange={(value) => {
              setActor(value === 'all' ? '' : value);
            }}
            options={[
              { value: 'all', label: t('filters.allActors') },
              ...(people.data?.data ?? []).map((user) => ({
                value: user.id,
                label: user.fullName,
              })),
            ]}
          />
        ) : null}
        <Select
          label={t('filters.action')}
          hideLabel
          value={group === '' ? 'all' : group}
          onChange={(value) => {
            setGroup(AUDIT_GROUPS.find((candidate) => candidate === value) ?? '');
          }}
          options={[
            { value: 'all', label: t('filters.allActions') },
            ...AUDIT_GROUPS.map((value) => ({ value, label: t(`groups.${value}`) })),
          ]}
        />
        {me.data?.hasAllBranches ? (
          <Select
            label={t('filters.scope')}
            hideLabel
            value={scope}
            onChange={(value) => {
              setScope(value === 'business' ? 'business' : 'branch');
            }}
            options={[
              { value: 'branch', label: t('filters.scopeBranch') },
              { value: 'business', label: t('filters.scopeBusiness') },
            ]}
          />
        ) : null}
        <Input label={t('filters.from')} type="date" value={from} onChange={setFrom} />
        <Input label={t('filters.to')} type="date" value={to} onChange={setTo} />
      </FilterBar>
      <AuditTable
        query={{
          scope,
          ...(actor ? { actorUserId: actor } : {}),
          ...(group ? { action: `${group}.` } : {}),
          ...(fromIso ? { from: fromIso } : {}),
          ...(toIso ? { to: toIso } : {}),
        }}
      />
    </>
  );
}
