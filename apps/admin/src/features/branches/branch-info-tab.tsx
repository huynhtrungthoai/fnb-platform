import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSetBranchActive, useUpdateBranch, useUpdateBranchSettings } from '@fnb/api-client';
import { formatDate } from '@fnb/i18n';
import {
  Button,
  ConfirmDialog,
  DangerButton,
  FormActions,
  FormSection,
  Icon,
  toast,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { FormTextField } from '../../shared-components/form-text-field';
import {
  branchHoursFormSchema,
  branchInfoFormSchema,
  toBranchHoursForm,
  toBranchInfoForm,
  toUpdateBranch,
  toUpdateHours,
} from './branch-forms';

import type { Branch, BranchSettings, Locale } from '@fnb/contract';

const infoTabSchema = z.object({ ...branchInfoFormSchema.shape, ...branchHoursFormSchema.shape });

type InfoTabInput = z.input<typeof infoTabSchema>;
type InfoTabOutput = z.output<typeof infoTabSchema>;

const INFO_FIELDS = ['code', 'name', 'phone', 'address', 'latitude', 'longitude'] as const;
const HOURS_FIELDS = [
  'timezone',
  'openTime',
  'closeTime',
  'dayCutoffTime',
  'taxRatePercent',
  'serviceChargePercent',
] as const;

export interface BranchInfoTabProps {
  branch: Branch;
  settings: BranchSettings;
  /** `branch.manage`: name, code, address, coordinates, deactivate. */
  canManage: boolean;
  /** `branch.settings` at this branch: hours, cutoff, tax. */
  canEditSettings: boolean;
  locale: Locale;
}

/**
 * First tab of a branch: its details (CORE-01) and its hours and tax (CORE-02). One save sends
 * only the parts that changed, each to its own endpoint and permission.
 */
export function BranchInfoTab({
  branch,
  settings,
  canManage,
  canEditSettings,
  locale,
}: BranchInfoTabProps) {
  const { t } = useTranslation(['branches', 'common']);
  const apiErrorMessage = useApiErrorMessage();
  const updateBranch = useUpdateBranch();
  const updateSettings = useUpdateBranchSettings();
  const setActive = useSetBranchActive();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const values: InfoTabInput = { ...toBranchInfoForm(branch), ...toBranchHoursForm(settings) };
  const form = useForm<InfoTabInput, unknown, InfoTabOutput>({
    resolver: zodResolver(infoTabSchema),
    values,
  });
  const { dirtyFields } = form.formState;
  const isInfoDirty = INFO_FIELDS.some((field) => dirtyFields[field] === true);
  const isHoursDirty = HOURS_FIELDS.some((field) => dirtyFields[field] === true);
  const isSaving = updateBranch.isPending || updateSettings.isPending;

  const submit = form.handleSubmit(async (output) => {
    try {
      if (isInfoDirty && canManage) {
        await updateBranch.mutateAsync({ id: branch.id, input: toUpdateBranch(output) });
      }
      if (isHoursDirty && canEditSettings) {
        await updateSettings.mutateAsync({ id: branch.id, input: toUpdateHours(output) });
      }
      toast({ tone: 'success', message: t('toast.saved', { name: output.name }) });
    } catch (error) {
      toast({ tone: 'danger', message: apiErrorMessage(error) });
    }
  });

  const toggleActive = () => {
    setActive.mutate(
      { id: branch.id, isActive: !branch.isActive },
      {
        onSuccess: (updated) => {
          setConfirmOpen(false);
          toast({
            tone: 'success',
            message: updated.isActive
              ? t('toast.activated', { name: updated.name })
              : t('toast.deactivated', { name: updated.name }),
          });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  };

  const customErrors = { coordinate: t('errors.coordinate'), percent: t('errors.percent') };
  const control = form.control;
  const pendingCutoff =
    settings.pendingDayCutoffTime && settings.pendingDayCutoffFrom
      ? t('fields.pendingCutoff', {
          time: settings.pendingDayCutoffTime,
          // A calendar date: format it at midnight UTC so no time zone shifts the day.
          date: formatDate(`${settings.pendingDayCutoffFrom}T00:00:00.000Z`, locale, 'UTC'),
        })
      : null;

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      {!canManage || !canEditSettings ? (
        <p className="text-text-muted flex items-center gap-2 text-sm">
          <Icon name="info" size={16} />
          {t('readOnly')}
        </p>
      ) : null}
      <FormSection title={t('sections.info')}>
        <FormTextField
          control={control}
          name="name"
          label={t('fields.name')}
          disabled={!canManage}
        />
        <FormTextField
          control={control}
          name="code"
          label={t('fields.code')}
          hint={t('fields.codeHint')}
          autoCapitalize="characters"
          disabled={!canManage}
        />
        <FormTextField
          control={control}
          name="phone"
          label={t('fields.phone')}
          type="tel"
          disabled={!canManage}
        />
        <FormTextField
          control={control}
          name="address"
          label={t('fields.address')}
          disabled={!canManage}
        />
        <FormTextField
          control={control}
          name="latitude"
          label={t('fields.latitude')}
          inputMode="decimal"
          hint={t('fields.coordinatesHint')}
          customErrors={customErrors}
          disabled={!canManage}
        />
        <FormTextField
          control={control}
          name="longitude"
          label={t('fields.longitude')}
          inputMode="decimal"
          customErrors={customErrors}
          disabled={!canManage}
        />
      </FormSection>
      <FormSection title={t('sections.hours')}>
        <FormTextField
          control={control}
          name="timezone"
          label={t('fields.timezone')}
          disabled={!canEditSettings}
        />
        <FormTextField
          control={control}
          name="dayCutoffTime"
          label={t('fields.dayCutoffTime')}
          type="time"
          hint={pendingCutoff ?? t('fields.dayCutoffHint')}
          disabled={!canEditSettings}
        />
        <FormTextField
          control={control}
          name="openTime"
          label={t('fields.openTime')}
          type="time"
          disabled={!canEditSettings}
        />
        <FormTextField
          control={control}
          name="closeTime"
          label={t('fields.closeTime')}
          type="time"
          disabled={!canEditSettings}
        />
      </FormSection>
      <FormSection title={t('sections.tax')}>
        <FormTextField
          control={control}
          name="taxRatePercent"
          label={t('fields.taxRatePercent')}
          inputMode="decimal"
          hint={t('fields.taxHint')}
          customErrors={customErrors}
          disabled={!canEditSettings}
        />
        <FormTextField
          control={control}
          name="serviceChargePercent"
          label={t('fields.serviceChargePercent')}
          inputMode="decimal"
          customErrors={customErrors}
          disabled={!canEditSettings}
        />
      </FormSection>
      {canManage || canEditSettings ? (
        <FormActions
          danger={
            canManage ? (
              branch.isActive ? (
                <DangerButton
                  icon="ban"
                  onClick={() => {
                    setConfirmOpen(true);
                  }}
                >
                  {t('actions.deactivate')}
                </DangerButton>
              ) : (
                <Button icon="restore" loading={setActive.isPending} onClick={toggleActive}>
                  {t('actions.activate')}
                </Button>
              )
            ) : null
          }
          secondary={
            <Button
              disabled={!form.formState.isDirty || isSaving}
              onClick={() => {
                form.reset(values);
              }}
            >
              {t('actions.cancel')}
            </Button>
          }
          primary={
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              disabled={!form.formState.isDirty}
            >
              {t('actions.save')}
            </Button>
          }
        />
      ) : null}
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => {
          setConfirmOpen(false);
        }}
        onConfirm={toggleActive}
        tone="danger"
        confirmIcon="ban"
        title={t('confirmDeactivate.title', { name: branch.name })}
        description={t('confirmDeactivate.description')}
        confirmLabel={t('actions.deactivate')}
        loading={setActive.isPending}
      />
    </form>
  );
}
