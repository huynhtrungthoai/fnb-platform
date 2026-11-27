import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Checkbox, EmptyState, SegmentedControl } from '@fnb/ui-web';

import type { PermissionCode, PermissionInfo } from '@fnb/contract';

type MatrixFilter = 'all' | 'sensitive' | 'on' | 'new';

export interface PermissionMatrixProps {
  /** The permission catalog (`GET /permissions`). */
  catalog: readonly PermissionInfo[];
  value: readonly PermissionCode[];
  onChange: (value: PermissionCode[]) => void;
  /** Whether a permission can be ticked or unticked here; false locks its box. */
  canChange: (code: PermissionCode) => boolean;
  /** Permissions added after the group was last edited (label "New"). */
  isNew?: (code: PermissionCode) => boolean;
  readOnly?: boolean;
}

/** Adds the permissions a ticked one requires, recursively (the API does the same). */
function withRequirements(
  codes: ReadonlySet<PermissionCode>,
  catalog: readonly PermissionInfo[],
): Set<PermissionCode> {
  const result = new Set(codes);
  let isGrowing = true;
  while (isGrowing) {
    isGrowing = false;
    for (const info of catalog) {
      if (result.has(info.code)) {
        for (const required of info.requires) {
          if (!result.has(required)) {
            result.add(required);
            isGrowing = true;
          }
        }
      }
    }
  }
  return result;
}

/**
 * The tick screen of a permission group (06 section 9): permissions grouped by module, with
 * search, filters and tags for sensitive, business-level, approvable and new permissions.
 */
export function PermissionMatrix({
  catalog,
  value,
  onChange,
  canChange,
  isNew = () => false,
  readOnly = false,
}: PermissionMatrixProps) {
  const { t } = useTranslation(['roles', 'permissions']);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MatrixFilter>('all');
  const selected = new Set(value);
  const newCount = catalog.filter((info) => isNew(info.code)).length;
  const name = (code: PermissionCode) => t(`permissions:codes.${code}.name`);
  const query = search.trim().toLowerCase();

  const visible = catalog.filter((info) => {
    if (query && !`${name(info.code)} ${info.code}`.toLowerCase().includes(query)) {
      return false;
    }
    switch (filter) {
      case 'all':
        return true;
      case 'sensitive':
        return info.isSensitive;
      case 'on':
        return selected.has(info.code);
      case 'new':
        return isNew(info.code);
    }
  });
  const modules = [...new Set(visible.map((info) => info.module))];

  const toggle = (codes: readonly PermissionCode[], isOn: boolean) => {
    const next = new Set(selected);
    for (const code of codes) {
      if (canChange(code)) {
        if (isOn) {
          next.add(code);
        } else {
          next.delete(code);
        }
      }
    }
    onChange([...(isOn ? withRequirements(next, catalog) : next)]);
  };

  return (
    <section aria-label={t('matrix.label')} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="h-control rounded-control border-border-strong bg-bg focus-within:outline-ring flex min-w-64 flex-1 items-center gap-2 border px-3 focus-within:outline-2">
          <span className="sr-only">{t('matrix.search')}</span>
          <input
            type="search"
            value={search}
            placeholder={t('matrix.searchPlaceholder')}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="text-control text-text placeholder:text-text-subtle h-full min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <SegmentedControl
          label={t('matrix.label')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('matrix.filterAll') },
            { value: 'sensitive', label: t('matrix.filterSensitive') },
            { value: 'on', label: t('matrix.filterOn') },
            ...(newCount > 0
              ? [{ value: 'new' as const, label: t('matrix.filterNew', { count: newCount }) }]
              : []),
          ]}
        />
      </div>
      {modules.length === 0 ? <EmptyState description={t('matrix.empty')} /> : null}
      {modules.map((module) => {
        const items = visible.filter((info) => info.module === module);
        const moduleItems = catalog.filter((info) => info.module === module);
        const onCount = moduleItems.filter((info) => selected.has(info.code)).length;
        const changeable = items.filter((info) => canChange(info.code)).map((info) => info.code);
        const allOn = items.every((info) => selected.has(info.code));
        const someOn = items.some((info) => selected.has(info.code));
        const moduleName = t(`permissions:modules.${module}`, { defaultValue: module });
        return (
          <div key={module} className="border-border bg-bg rounded-md border">
            <div className="border-border bg-bg-subtle flex items-center justify-between gap-3 border-b px-4 py-2">
              <Checkbox
                checked={allOn ? true : someOn ? 'indeterminate' : false}
                onChange={(isOn) => {
                  toggle(changeable, isOn);
                }}
                disabled={readOnly || changeable.length === 0}
                label={<span className="font-semibold">{moduleName}</span>}
              />
              <span className="text-text-muted text-sm tabular-nums">
                {t('matrix.count', { on: onCount, total: moduleItems.length })}
              </span>
            </div>
            <ul className="divide-border flex flex-col divide-y">
              {items.map((info) => {
                const isChangeable = !readOnly && canChange(info.code);
                return (
                  <li
                    key={info.code}
                    className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
                  >
                    <Checkbox
                      checked={selected.has(info.code)}
                      onChange={(isOn) => {
                        toggle([info.code], isOn);
                      }}
                      disabled={!isChangeable}
                      label={name(info.code)}
                      description={
                        <>
                          <code>{info.code}</code>
                          {info.requires.length > 0
                            ? ` · ${t('matrix.requires', { codes: info.requires.join(', ') })}`
                            : ''}
                          {!readOnly && !canChange(info.code) ? ` · ${t('matrix.notHeld')}` : ''}
                        </>
                      }
                    />
                    <span className="flex flex-wrap gap-1">
                      {isNew(info.code) ? (
                        <Badge tone="primary">{t('permissions:labels.new')}</Badge>
                      ) : null}
                      {info.scope === 'business' ? (
                        <Badge tone="info">{t('permissions:labels.business')}</Badge>
                      ) : null}
                      {info.isSensitive ? (
                        <Badge tone="warning" icon="triangle-alert">
                          {t('permissions:labels.sensitive')}
                        </Badge>
                      ) : null}
                      {info.isApprovable ? (
                        <Badge>{t('permissions:labels.approvable')}</Badge>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
