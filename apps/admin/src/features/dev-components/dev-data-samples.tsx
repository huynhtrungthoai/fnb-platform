import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Card,
  Checkbox,
  DataTable,
  FilterBar,
  LocalizedInput,
  Pagination,
  Select,
} from '@fnb/ui-web';

import type { LocalizedText } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

interface SampleRow {
  id: string;
  name: string;
  isLocked: boolean;
}

const ROWS: SampleRow[] = [
  { id: 'lan', name: 'Nguyễn Lan', isLocked: false },
  { id: 'minh', name: 'Trần Minh', isLocked: true },
];

/** Samples of the list pattern: filter bar, table states, paging, tick boxes, two-language names. */
export function DevDataSamples() {
  const { t } = useTranslation('dev');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [isTicked, setTicked] = useState(true);
  const [name, setName] = useState<LocalizedText>({ vi: t('data.nameVi') });
  const [state, setState] = useState<'rows' | 'loading' | 'empty' | 'error'>('rows');

  const columns: Column<SampleRow>[] = [
    { key: 'name', header: t('data.name'), cell: (row) => row.name },
    {
      key: 'status',
      header: t('data.status'),
      cell: (row) =>
        row.isLocked ? (
          <Badge tone="danger" icon="lock">
            {t('data.locked')}
          </Badge>
        ) : (
          <Badge tone="success" icon="check">
            {t('data.active')}
          </Badge>
        ),
    },
  ];

  return (
    <Card title={t('sections.data')}>
      <div className="flex flex-col gap-4">
        <FilterBar
          search={{
            label: t('data.search'),
            value: search,
            onChange: setSearch,
            placeholder: t('data.search'),
          }}
          isFiltered={search !== '' || status !== 'all'}
          onClear={() => {
            setSearch('');
            setStatus('all');
          }}
        >
          <Select
            label={t('data.status')}
            hideLabel
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: t('data.allStatuses') },
              { value: 'locked', label: t('data.locked') },
            ]}
          />
          <Select
            label={t('data.state')}
            hideLabel
            value={state}
            onChange={(value) => {
              if (
                value === 'rows' ||
                value === 'loading' ||
                value === 'empty' ||
                value === 'error'
              ) {
                setState(value);
              }
            }}
            options={[
              { value: 'rows', label: t('data.stateRows') },
              { value: 'loading', label: t('data.stateLoading') },
              { value: 'empty', label: t('data.stateEmpty') },
              { value: 'error', label: t('data.stateError') },
            ]}
          />
        </FilterBar>
        <DataTable
          label={t('sections.data')}
          columns={columns}
          rows={state === 'loading' ? undefined : state === 'empty' ? [] : ROWS}
          rowKey={(row) => row.id}
          loading={state === 'loading'}
          error={state === 'error'}
          onRetry={() => {
            setState('rows');
          }}
          rowTone={(row) => (row.isLocked ? 'warning' : 'default')}
          footer={<Pagination page={page} pageSize={20} total={95} onChange={setPage} />}
        />
        <Checkbox
          checked={isTicked}
          onChange={setTicked}
          label={t('data.tick')}
          description="branch.view"
        />
        <LocalizedInput label={t('data.localized')} value={name} onChange={setName} />
      </div>
    </Card>
  );
}
