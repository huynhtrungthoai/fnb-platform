import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  useCreateRole,
  useMe,
  usePermissionCatalog,
  useRestoreRoleDefault,
  useRole,
  useUpdateRole,
} from '@fnb/api-client';
import { permissionCodeSchema } from '@fnb/contract';
import { localize, resolveLocale } from '@fnb/i18n';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Icon,
  LocalizedInput,
  PageHeader,
  Skeleton,
  Tabs,
  toast,
  usePermission,
} from '@fnb/ui-web';

import { useApiErrorMessage } from '../../lib/form-errors';
import { FormTextField } from '../../shared-components/form-text-field';
import { PermissionMatrix } from '../../shared-components/permission-matrix';
import { heldPermissions, isOwnRole, newPermissions } from './role-helpers';
import { RoleMembers } from './role-members';

import type { PermissionInfo, Role } from '@fnb/contract';

/** A limit typed as text: empty means no limit. */
const limitField = (isValid: (value: number) => boolean, error: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || isValid(Number(value)), { error })
    .transform((value) => (value === '' ? null : Number(value)));

const roleFormSchema = z.object({
  name: z.object({
    vi: z.string().trim().min(1, { error: 'nameRequired' }),
    en: z.string().optional(),
  }),
  description: z.string().trim().max(300),
  permissions: z.array(permissionCodeSchema),
  maxDiscountPercent: limitField((value) => value >= 0 && value <= 100, 'percentInvalid'),
  maxPayOutAmount: limitField(
    (value) => Number.isSafeInteger(value) && value >= 0,
    'amountInvalid',
  ),
  maxRefundAmount: limitField(
    (value) => Number.isSafeInteger(value) && value >= 0,
    'amountInvalid',
  ),
});

type RoleFormInput = z.input<typeof roleFormSchema>;
type RoleFormOutput = z.output<typeof roleFormSchema>;

const asText = (value: number | null) => (value === null ? '' : String(value));

function toForm(role: Role | undefined): RoleFormInput {
  return {
    name: { vi: role?.name.vi ?? '', ...(role?.name.en ? { en: role.name.en } : {}) },
    description: role?.description ?? '',
    permissions: [...(role?.permissions ?? [])],
    maxDiscountPercent: asText(role?.limits.maxDiscountPercent ?? null),
    maxPayOutAmount: asText(role?.limits.maxPayOutAmount ?? null),
    maxRefundAmount: asText(role?.limits.maxRefundAmount ?? null),
  };
}

function toPayload(values: RoleFormOutput) {
  const en = values.name.en?.trim() ?? '';
  return {
    name: { vi: values.name.vi, ...(en ? { en } : {}) },
    description: values.description === '' ? null : values.description,
    permissions: values.permissions,
    limits: {
      maxDiscountPercent: values.maxDiscountPercent,
      maxPayOutAmount: values.maxPayOutAmount,
      maxRefundAmount: values.maxRefundAmount,
    },
  };
}

export interface RoleEditorPageProps {
  /** Null creates a custom group. */
  roleId: string | null;
  onBack: () => void;
  onSaved: (role: Role) => void;
}

/** HT5 Edit a permission group (CORE-22, 25, 26, 27): permission matrix, names and limits. */
export function RoleEditorPage({ roleId, onBack, onSaved }: RoleEditorPageProps) {
  const { t } = useTranslation(['roles', 'admin']);
  const role = useRole(roleId);
  const catalog = usePermissionCatalog();

  if (role.isError || catalog.isError) {
    return (
      <Card>
        <ErrorState
          onRetry={() => {
            void role.refetch();
            void catalog.refetch();
          }}
        />
      </Card>
    );
  }
  if ((roleId !== null && !role.data) || !catalog.data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="line" />
        <Skeleton shape="rect" />
        <span className="sr-only">{t('title')}</span>
      </div>
    );
  }
  return (
    <RoleEditor
      key={role.data?.id ?? 'new'}
      role={role.data}
      catalog={catalog.data}
      onBack={onBack}
      onSaved={onSaved}
    />
  );
}

function RoleEditor({
  role,
  catalog,
  onBack,
  onSaved,
}: {
  role: Role | undefined;
  catalog: readonly PermissionInfo[];
  onBack: () => void;
  onSaved: (role: Role) => void;
}) {
  const { t, i18n } = useTranslation(['roles', 'admin']);
  const locale = resolveLocale(i18n.language);
  const apiErrorMessage = useApiErrorMessage();
  const me = useMe();
  const canManage = usePermission('role.manage');
  const create = useCreateRole();
  const update = useUpdateRole();
  const restore = useRestoreRoleDefault();
  const [tab, setTab] = useState('permissions');
  const [isRestoreOpen, setRestoreOpen] = useState(false);

  const isOwn = role ? isOwnRole(me.data, role.id) : false;
  const isLocked = role?.isLocked ?? false;
  const readOnly = !canManage || isLocked || isOwn;
  const held = heldPermissions(me.data);
  const fresh = role ? newPermissions(catalog, role) : new Set<string>();
  const values = toForm(role);
  const form = useForm<RoleFormInput, unknown, RoleFormOutput>({
    resolver: zodResolver(roleFormSchema),
    values,
  });
  const permissions = form.watch('permissions');
  const original = new Set(role?.permissions ?? []);
  const isSaving = create.isPending || update.isPending;
  const customErrors = {
    nameRequired: t('edit.nameRequired'),
    amountInvalid: t('edit.amountInvalid'),
    percentInvalid: t('edit.percentInvalid'),
  };

  const submit = form.handleSubmit((output) => {
    const payload = toPayload(output);
    const options = {
      onSuccess: (saved: Role) => {
        const name = localize(saved.name, locale);
        toast({
          tone: 'success',
          message: role ? t('toast.saved', { name }) : t('toast.created', { name }),
        });
        onSaved(saved);
      },
      onError: (error: unknown) => {
        toast({ tone: 'danger', message: apiErrorMessage(error) });
      },
    };
    if (role) {
      update.mutate({ id: role.id, input: payload }, options);
    } else {
      create.mutate(payload, options);
    }
  });

  const title = role ? localize(role.name, locale) : t('edit.newTitle');
  const note = isLocked
    ? t('edit.lockedNote')
    : isOwn
      ? t('edit.ownRoleNote')
      : !canManage
        ? t('edit.readOnlyNote')
        : t('edit.rulesNote');

  const editor = (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Controller
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <PermissionMatrix
              catalog={catalog}
              value={field.value}
              onChange={field.onChange}
              readOnly={readOnly}
              // Granting needs the permission yourself; removing one never escalates (06 section 8).
              canChange={(code) => held.has(code) || original.has(code)}
              isNew={(code) => fresh.has(code)}
            />
          )}
        />
      </div>
      <aside className="flex flex-col gap-4">
        <Card title={t('edit.infoTitle')}>
          <div className="flex flex-col gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <LocalizedInput
                  label={t('edit.name')}
                  value={{ vi: field.value.vi, ...(field.value.en ? { en: field.value.en } : {}) }}
                  onChange={field.onChange}
                  disabled={readOnly}
                  {...(fieldState.error ? { error: t('edit.nameRequired') } : {})}
                />
              )}
            />
            <FormTextField
              control={form.control}
              name="description"
              label={t('edit.descriptionField')}
              disabled={readOnly}
            />
            {role?.code ? (
              <p className="text-text-muted text-sm">{t('edit.codeNote', { code: role.code })}</p>
            ) : null}
          </div>
        </Card>
        <Card title={t('edit.limitsTitle')}>
          <div className="flex flex-col gap-4">
            <p className="text-text-muted text-sm">{t('edit.limitsDescription')}</p>
            <FormTextField
              control={form.control}
              name="maxDiscountPercent"
              label={t('edit.maxDiscountPercent')}
              inputMode="decimal"
              customErrors={customErrors}
              disabled={readOnly}
            />
            <FormTextField
              control={form.control}
              name="maxPayOutAmount"
              label={t('edit.maxPayOutAmount')}
              inputMode="numeric"
              customErrors={customErrors}
              disabled={readOnly}
            />
            <FormTextField
              control={form.control}
              name="maxRefundAmount"
              label={t('edit.maxRefundAmount')}
              inputMode="numeric"
              customErrors={customErrors}
              disabled={readOnly}
            />
          </div>
        </Card>
        <p className="text-text-muted flex items-start gap-2 text-sm">
          <Icon name="info" size={16} className="mt-0.5" />
          <span>{note}</span>
        </p>
      </aside>
    </div>
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <PageHeader
        title={title}
        breadcrumb={[
          { label: t('admin:nav.groups.system') },
          { label: t('title'), onSelect: onBack },
          { label: title },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {role ? (
              <Badge
                {...(role.isSystem
                  ? { icon: 'shield' as const }
                  : { tone: 'primary' as const, icon: 'edit' as const })}
              >
                {role.isLocked
                  ? t('type.locked')
                  : role.isSystem
                    ? t('type.system')
                    : t('type.custom')}
              </Badge>
            ) : null}
            {role
              ? t('edit.description', {
                  permissions: permissions.length,
                  members: role.memberCount,
                })
              : t('edit.newDescription')}
          </span>
        }
        actions={
          readOnly ? null : (
            <>
              {role?.isSystem ? (
                <Button
                  icon="restore"
                  onClick={() => {
                    setRestoreOpen(true);
                  }}
                >
                  {t('actions.restore')}
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  if (form.formState.isDirty) {
                    form.reset(values);
                  } else {
                    onBack();
                  }
                }}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSaving}
                disabled={role !== undefined && !form.formState.isDirty}
              >
                {t('actions.save')}
              </Button>
            </>
          )
        }
      />
      {role ? (
        <Tabs
          label={t('edit.tabs.label')}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'permissions', label: t('edit.tabs.permissions'), content: editor },
            {
              value: 'members',
              label: t('edit.tabs.members', { count: role.memberCount }),
              content: <RoleMembers roleId={role.id} />,
            },
          ]}
        />
      ) : (
        editor
      )}
      {role ? (
        <ConfirmDialog
          open={isRestoreOpen}
          onClose={() => {
            setRestoreOpen(false);
          }}
          onConfirm={() => {
            restore.mutate(role.id, {
              onSuccess: (saved) => {
                setRestoreOpen(false);
                toast({
                  tone: 'success',
                  message: t('toast.restored', { name: localize(saved.name, locale) }),
                });
              },
              onError: (error) => {
                toast({ tone: 'danger', message: apiErrorMessage(error) });
              },
            });
          }}
          tone="danger"
          confirmIcon="restore"
          title={t('restoreDialog.title', { name: title })}
          description={t('restoreDialog.description')}
          confirmLabel={t('actions.restore')}
          loading={restore.isPending}
        />
      ) : null}
    </form>
  );
}
