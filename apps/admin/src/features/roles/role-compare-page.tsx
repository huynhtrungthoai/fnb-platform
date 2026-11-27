import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermissionCatalog, useRoles } from '@fnb/api-client';
import { formatMoney, localize, resolveLocale } from '@fnb/i18n';
import {
  Button,
  Checkbox,
  DataTable,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  Select,
  usePermission,
} from '@fnb/ui-web';

import type { Role, RoleLimits } from '@fnb/contract';
import type { Column } from '@fnb/ui-web';

interface CompareRow {
  key: string;
  label: string;
  code: string;
  a: string | boolean;
  b: string | boolean;
  isDifferent: boolean;
}

const LIMIT_KEYS = ['maxDiscountPercent', 'maxPayOutAmount', 'maxRefundAmount'] as const;

export interface RoleComparePageProps {
  roleA: string | undefined;
  roleB: string | undefined;
  onChange: (roleA: string | undefined, roleB: string | undefined) => void;
  onBack: () => void;
  onEdit: (roleId: string) => void;
}

/** HT6 Compare two permission groups side by side (CORE-29). */
export function RoleComparePage({ roleA, roleB, onChange, onBack, onEdit }: RoleComparePageProps) {
  const { t, i18n } = useTranslation(['roles', 'permissions', 'admin']);
  const locale = resolveLocale(i18n.language);
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const canManage = usePermission('role.manage');
  const [isOnlyDiff, setOnlyDiff] = useState(true);
  const list = roles.data ?? [];
  const a = list.find((role) => role.id === roleA);
  const b = list.find((role) => role.id === roleB);
  const options = list.map((role) => ({ value: role.id, label: localize(role.name, locale) }));

  const limitText = (limits: RoleLimits, key: (typeof LIMIT_KEYS)[number]): string => {
    const value = limits[key];
    if (value === null) {
      return t('noLimits');
    }
    return key === 'maxDiscountPercent' ? `${value}%` : formatMoney(value, locale);
  };

  const rows: CompareRow[] =
    a && b
      ? [
          ...(catalog.data ?? []).map((info) => {
            const hasA = a.permissions.includes(info.code);
            const hasB = b.permissions.includes(info.code);
            return {
              key: info.code,
              label: t(`permissions:codes.${info.code}.name`),
              code: info.code,
              a: hasA,
              b: hasB,
              isDifferent: hasA !== hasB,
            };
          }),
          ...LIMIT_KEYS.map((key) => {
            const valueA = limitText(a.limits, key);
            const valueB = limitText(b.limits, key);
            return {
              key,
              label: t(`edit.${key}`),
              code: '',
              a: valueA,
              b: valueB,
              isDifferent: valueA !== valueB,
            };
          }),
        ]
      : [];
  const diffCount = rows.filter((row) => row.isDifferent).length;
  const shown = isOnlyDiff ? rows.filter((row) => row.isDifferent) : rows;

  const cell = (value: string | boolean) =>
    typeof value === 'string' ? (
      value
    ) : (
      <span className="inline-flex items-center gap-1">
        <Icon
          name={value ? 'check' : 'x'}
          size={16}
          className={value ? 'text-success-text' : 'text-text-subtle'}
        />
        {value ? t('compareView.has') : t('compareView.hasNot')}
      </span>
    );

  const columns: Column<CompareRow>[] = [
    {
      key: 'label',
      header: t('compareView.column'),
      cell: (row) => (
        <span className="flex flex-col">
          <span>{row.label}</span>
          {row.code ? <code className="text-text-subtle text-xs">{row.code}</code> : null}
        </span>
      ),
    },
    {
      key: 'a',
      header: a ? localize(a.name, locale) : t('compareView.roleA'),
      cell: (row) => cell(row.a),
    },
    {
      key: 'b',
      header: b ? localize(b.name, locale) : t('compareView.roleB'),
      cell: (row) => cell(row.b),
    },
  ];

  const editable = (role: Role | undefined) => role && canManage && !role.isLocked;

  return (
    <>
      <PageHeader
        title={t('compareView.title')}
        description={t('compareView.description')}
        breadcrumb={[
          { label: t('admin:nav.groups.system') },
          { label: t('title'), onSelect: onBack },
          { label: t('compareView.title') },
        ]}
        actions={
          b && editable(b) ? (
            <Button
              variant="primary"
              icon="edit"
              onClick={() => {
                onEdit(b.id);
              }}
            >
              {t('actions.editRole', { name: localize(b.name, locale) })}
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t('compareView.roleA')}
          options={options}
          value={roleA ?? ''}
          onChange={(value) => {
            onChange(value, roleB);
          }}
          className="min-w-64"
        />
        <IconButton
          icon="compare"
          variant="outline"
          label={t('actions.swap')}
          onClick={() => {
            onChange(roleB, roleA);
          }}
        />
        <Select
          label={t('compareView.roleB')}
          options={options}
          value={roleB ?? ''}
          onChange={(value) => {
            onChange(roleA, value);
          }}
          className="min-w-64"
        />
        <Checkbox
          checked={isOnlyDiff}
          onChange={setOnlyDiff}
          label={t('compareView.onlyDiff')}
          className="pb-2"
        />
      </div>
      {a && b ? (
        <>
          <p className="text-text-muted text-sm">
            {t('compareView.summary', {
              diff: diffCount,
              same: rows.length - diffCount,
              a: a.permissions.length,
              b: b.permissions.length,
            })}
          </p>
          <DataTable
            label={t('compareView.tableLabel')}
            columns={columns}
            rows={shown}
            rowKey={(row) => row.key}
            loading={catalog.isPending}
            error={catalog.isError || roles.isError}
            rowTone={(row) => (row.isDifferent ? 'warning' : 'default')}
            empty={<EmptyState description={t('compareView.same')} />}
          />
        </>
      ) : (
        <EmptyState description={t('compareView.pick')} />
      )}
    </>
  );
}
