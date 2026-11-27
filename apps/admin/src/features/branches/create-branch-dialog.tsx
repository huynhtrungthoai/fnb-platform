import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCreateBranch } from '@fnb/api-client';
import { Button, Dialog, toast } from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { FormTextField } from '../../shared-components/form-text-field';
import { branchInfoFormSchema, toBranchInfoForm } from './branch-forms';

import type { BranchInfoFormInput, BranchInfoFormOutput } from './branch-forms';
import type { Branch } from '@fnb/contract';

const createFormSchema = branchInfoFormSchema.pick({
  code: true,
  name: true,
  phone: true,
  address: true,
});

type CreateFormInput = Pick<BranchInfoFormInput, 'code' | 'name' | 'phone' | 'address'>;
type CreateFormOutput = Pick<BranchInfoFormOutput, 'code' | 'name' | 'phone' | 'address'>;

export interface CreateBranchDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (branch: Branch) => void;
}

/** Creates a branch with default settings (`branch.manage`). */
export function CreateBranchDialog({ open, onClose, onCreated }: CreateBranchDialogProps) {
  const { t } = useTranslation(['branches', 'common']);
  const apiErrorMessage = useApiErrorMessage();
  const create = useCreateBranch();
  const { code, name, phone, address } = toBranchInfoForm(undefined);
  const form = useForm<CreateFormInput, unknown, CreateFormOutput>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { code, name, phone, address },
  });

  const close = () => {
    form.reset();
    create.reset();
    onClose();
  };

  const submit = form.handleSubmit((output) => {
    create.mutate(
      {
        code: output.code,
        name: output.name,
        phone: output.phone === '' ? null : output.phone,
        address: output.address === '' ? null : output.address,
      },
      {
        onSuccess: (branch) => {
          toast({ tone: 'success', message: t('toast.created', { name: branch.name }) });
          form.reset();
          onCreated(branch);
        },
        onError: (error) => {
          toast({ tone: 'danger', message: apiErrorMessage(error) });
        },
      },
    );
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('createDialog.title')}
      description={t('createDialog.description')}
      footer={
        <>
          <Button onClick={close}>{t('actions.cancel')}</Button>
          <Button
            type="submit"
            form="create-branch-form"
            variant="primary"
            loading={create.isPending}
          >
            {t('actions.create')}
          </Button>
        </>
      }
    >
      <form
        id="create-branch-form"
        noValidate
        onSubmit={(event) => void submit(event)}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <FormTextField control={form.control} name="name" label={t('fields.name')} />
        <FormTextField
          control={form.control}
          name="code"
          label={t('fields.code')}
          hint={t('fields.codeHint')}
          autoCapitalize="characters"
        />
        <FormTextField control={form.control} name="phone" label={t('fields.phone')} type="tel" />
        <FormTextField control={form.control} name="address" label={t('fields.address')} />
      </form>
    </Dialog>
  );
}
