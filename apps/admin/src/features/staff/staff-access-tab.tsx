import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useAssignRole,
  useMe,
  usePermissionCatalog,
  useRoles,
  useUserAccess,
} from '@fnb/api-client';
import { formatDate, formatMoney, localize, resolveLocale } from '@fnb/i18n';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  SegmentedControl,
  Select,
  Skeleton,
  toast,
  usePermission,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';

import type { PermissionCode, RoleLimits, UserWithAssignments } from '@fnb/contract';

/** Key of an assignment place: a branch id, or `all` for the all-branches assignment. */
const ALL = 'all';

export interface StaffAccessTabProps {
  user: UserWithAssignments;
  isSelf: boolean;
}

/** Limits of a group as short lines, for the effective permission view. */
function useLimitLines(limits: RoleLimits | undefined): string[] {
  const { t, i18n } = useTranslation('staff');
  const locale = resolveLocale(i18n.language);
  const lines: string[] = [];
  if (limits?.maxDiscountPercent !== null && limits?.maxDiscountPercent !== undefined) {
    lines.push(t('limits.maxDiscountPercent', { value: limits.maxDiscountPercent }));
  }
  if (limits?.maxPayOutAmount !== null && limits?.maxPayOutAmount !== undefined) {
    lines.push(t('limits.maxPayOutAmount', { value: formatMoney(limits.maxPayOutAmount, locale) }));
  }
  if (limits?.maxRefundAmount !== null && limits?.maxRefundAmount !== undefined) {
    lines.push(t('limits.maxRefundAmount', { value: formatMoney(limits.maxRefundAmount, locale) }));
  }
  return lines;
}

/**
 * HT3 Access of one staff member (CORE-11, CORE-29): the group at each branch, and what the
 * person may effectively do at a chosen branch.
 */
export function StaffAccessTab({ user, isSelf }: StaffAccessTabProps) {
  const { t, i18n } = useTranslation(['staff', 'permissions', 'common']);
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const me = useMe();
  const canViewRoles = usePermission('role.view');
  const roles = useRoles({ enabled: canViewRoles });
  const catalog = usePermissionCatalog({ enabled: canViewRoles });
  const access = useUserAccess(user.id);
  const assign = useAssignRole();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [inspected, setInspected] = useState<string | null>(null);

  const current: Record<string, string> = {};
  const since: Record<string, string> = {};
  const roleNames: Record<string, string> = {};
  for (const assignment of user.assignments) {
    const key = assignment.branch?.id ?? ALL;
    current[key] = assignment.role.id;
    since[key] = assignment.since;
    roleNames[key] = localize(assignment.role.name, locale);
  }
  const canAssignEverywhere = (me.data?.branches ?? []).some(
    (entry) => entry.isAllBranches && entry.permissions.includes('role.assign'),
  );
  const places = [
    ...(me.data?.hasAllBranches
      ? [{ key: ALL, name: t('allBranches'), canAssign: canAssignEverywhere }]
      : []),
    ...(me.data?.branches ?? []).map((entry) => ({
      key: entry.branch.id,
      name: entry.branch.name,
      canAssign: entry.permissions.includes('role.assign'),
    })),
  ];
  const valueAt = (key: string) => draft[key] ?? current[key] ?? '';
  const changed = places.filter((place) => valueAt(place.key) !== (current[place.key] ?? ''));
  const roleOptions = [
    { value: 'none', label: t('detail.notWorkingHere') },
    ...(roles.data ?? [])
      .filter((role) => !role.isLocked || Object.values(current).includes(role.id))
      .map((role) => ({ value: role.id, label: localize(role.name, locale) })),
  ];

  const save = async () => {
    try {
      for (const place of changed) {
        const roleId = valueAt(place.key);
        await assign.mutateAsync({
          id: user.id,
          branchId: place.key === ALL ? null : place.key,
          roleId: roleId === '' ? null : roleId,
        });
      }
      setDraft({});
      toast({ tone: 'success', message: t('toast.accessSaved', { name: user.fullName }) });
    } catch (error) {
      toast({ tone: 'danger', message: apiErrorMessage(error) });
    }
  };

  const branchAccess = access.data?.branches ?? [];
  const shown =
    branchAccess.find((entry) => (entry.branch?.id ?? ALL) === inspected) ??
    branchAccess[0] ??
    null;
  const granted = new Set<PermissionCode>(shown?.permissions ?? []);
  const limitLines = useLimitLines(shown?.limits);
  const catalogRows = catalog.data ?? [];
  const modules = [...new Set(catalogRows.map((info) => info.module))];

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <Card title={t('detail.accessTitle')}>
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">{t('detail.accessDescription')}</p>
          <table className="w-full text-sm">
            <thead className="text-text-muted text-left text-xs">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t('detail.branchColumn')}
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t('detail.roleColumn')}
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  {t('detail.since')}
                </th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => {
                const sinceValue = since[place.key];
                const isEditable = place.canAssign && !isSelf && canViewRoles;
                const value = valueAt(place.key);
                return (
                  <tr key={place.key} className="border-border border-t">
                    <td className="py-2 pr-3 font-medium">{place.name}</td>
                    <td className="py-2 pr-3">
                      {isEditable ? (
                        <Select
                          label={`${t('detail.roleColumn')} · ${place.name}`}
                          hideLabel
                          options={roleOptions}
                          value={value === '' ? 'none' : value}
                          onChange={(next) => {
                            setDraft({ ...draft, [place.key]: next === 'none' ? '' : next });
                          }}
                        />
                      ) : (
                        <span className={value === '' ? 'text-text-subtle' : ''}>
                          {value === '' ? t('detail.notWorkingHere') : (roleNames[place.key] ?? '')}
                        </span>
                      )}
                    </td>
                    <td className="text-text-muted py-2 text-right tabular-nums">
                      {sinceValue ? formatDate(sinceValue, locale) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-text-muted flex items-start gap-2 text-sm">
            <Icon name="info" size={16} className="mt-0.5" />
            <span>{t('detail.accessNote')}</span>
          </p>
          {changed.length > 0 ? (
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setDraft({});
                }}
                disabled={assign.isPending}
              >
                {t('actions.cancel')}
              </Button>
              <Button variant="primary" loading={assign.isPending} onClick={() => void save()}>
                {t('actions.saveAccess')}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title={t('detail.effectiveTitle')}>
        {access.isError ? (
          <ErrorState onRetry={() => void access.refetch()} />
        ) : !access.data ? (
          <Skeleton shape="rect" />
        ) : !shown ? (
          <EmptyState description={t('detail.effectiveEmpty')} />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-text-muted text-sm">{t('detail.effectiveDescription')}</p>
            <SegmentedControl
              label={t('detail.effectiveBranch')}
              value={shown.branch?.id ?? ALL}
              onChange={setInspected}
              options={branchAccess.map((entry) => ({
                value: entry.branch?.id ?? ALL,
                label: entry.branch?.name ?? t('allBranches'),
              }))}
            />
            <p className="text-sm">
              {shown.isAllBranches
                ? t('detail.viaAllBranches', { role: localize(shown.role.name, locale) })
                : t('detail.roleAt', { role: localize(shown.role.name, locale) })}
            </p>
            {limitLines.length > 0 ? (
              <ul className="text-warning-text flex flex-col gap-1 text-sm">
                {limitLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {catalogRows.length > 0 ? (
              modules.map((module) => (
                <div key={module} className="flex flex-col gap-2">
                  <p className="text-text-subtle text-xs font-semibold uppercase">
                    {t(`permissions:modules.${module}`, { defaultValue: module })}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {catalogRows
                      .filter((info) => info.module === module)
                      .map((info) => {
                        const isGranted = granted.has(info.code);
                        return (
                          <li key={info.code} className="flex items-start gap-2 text-sm">
                            <span
                              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${isGranted ? 'bg-success-subtle text-success-text' : 'bg-bg-muted text-text-subtle'}`}
                            >
                              <Icon
                                name={isGranted ? 'check' : 'x'}
                                size={16}
                                label={isGranted ? t('detail.granted') : t('detail.notGranted')}
                              />
                            </span>
                            <span className="flex flex-col">
                              <span className={isGranted ? 'text-text' : 'text-text-muted'}>
                                {t(`permissions:codes.${info.code}.name`)}{' '}
                                <code className="text-text-subtle text-xs">{info.code}</code>
                              </span>
                              {!isGranted && info.isApprovable ? (
                                <span className="text-text-subtle text-xs">
                                  {t('detail.approvable')}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ))
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {[...granted].map((code) => (
                  <li key={code} className="flex items-center gap-2">
                    <Icon name="check" size={16} className="text-success-text" />
                    {t(`permissions:codes.${code}.name`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
