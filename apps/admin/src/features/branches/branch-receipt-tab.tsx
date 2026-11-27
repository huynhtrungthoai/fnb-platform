import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useUpdateBranchSettings } from '@fnb/api-client';
import { Button, FormActions, FormSection, Icon, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { FormTextField } from '../../shared-components/form-text-field';
import { branchReceiptFormSchema, toBranchReceiptForm, toUpdateReceipt } from './branch-forms';

import type { BranchReceiptFormValues } from './branch-forms';
import type { Branch, BranchSettings } from '@fnb/contract';

export interface BranchReceiptTabProps {
  branch: Branch;
  settings: BranchSettings;
  /** `branch.settings` at this branch. */
  canEdit: boolean;
}

/** Second tab of a branch: what the receipt prints and the account that receives QR transfers. */
export function BranchReceiptTab({ branch, settings, canEdit }: BranchReceiptTabProps) {
  const { t } = useTranslation(['branches', 'common']);
  const apiErrorMessage = useApiErrorMessage();
  const updateSettings = useUpdateBranchSettings();
  const values = toBranchReceiptForm(settings);
  const form = useForm<BranchReceiptFormValues, unknown, BranchReceiptFormValues>({
    resolver: zodResolver(branchReceiptFormSchema),
    values,
  });

  const submit = form.handleSubmit((output) => {
    updateSettings.mutate(
      { id: branch.id, input: toUpdateReceipt(output) },
      {
        onSuccess: () => {
          toast({ tone: 'success', message: t('toast.saved', { name: branch.name }) });
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  });

  const control = form.control;
  const customErrors = { bankIncomplete: t('errors.bankIncomplete') };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      {canEdit ? null : (
        <p className="text-text-muted flex items-center gap-2 text-sm">
          <Icon name="info" size={16} />
          {t('readOnly')}
        </p>
      )}
      <FormSection title={t('sections.receipt')} description={t('sections.receiptDescription')}>
        <FormTextField
          control={control}
          name="businessName"
          label={t('fields.businessName')}
          placeholder={branch.name}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="taxCode"
          label={t('fields.taxCode')}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="address"
          label={t('fields.receiptAddress')}
          placeholder={branch.address ?? ''}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="phone"
          label={t('fields.receiptPhone')}
          type="tel"
          placeholder={branch.phone ?? ''}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="footer"
          label={t('fields.footer')}
          className="md:col-span-2"
          disabled={!canEdit}
        />
      </FormSection>
      <FormSection title={t('sections.bank')} description={t('sections.bankDescription')}>
        <FormTextField
          control={control}
          name="bankCode"
          label={t('fields.bankCode')}
          hint={t('fields.bankCodeHint')}
          customErrors={customErrors}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="accountNumber"
          label={t('fields.accountNumber')}
          inputMode="numeric"
          customErrors={customErrors}
          disabled={!canEdit}
        />
        <FormTextField
          control={control}
          name="accountName"
          label={t('fields.accountName')}
          customErrors={customErrors}
          disabled={!canEdit}
        />
      </FormSection>
      {canEdit ? (
        <FormActions
          secondary={
            <Button
              disabled={!form.formState.isDirty || updateSettings.isPending}
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
              loading={updateSettings.isPending}
              disabled={!form.formState.isDirty}
            >
              {t('actions.save')}
            </Button>
          }
        />
      ) : null}
    </form>
  );
}
