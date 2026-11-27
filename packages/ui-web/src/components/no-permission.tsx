import { useTranslation } from 'react-i18next';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { PermissionCode } from '@fnb/contract';
import type { ReactNode } from 'react';

export interface NoPermissionProps {
  /** The permission the screen needs; its name is shown so the user knows what to ask for. */
  permission?: PermissionCode;
  /** Defaults to the shared "no permission" title. */
  title?: string;
  /** A way out, usually a button back to the home screen. */
  action?: ReactNode;
  className?: string;
}

/** Shown in place of a screen or area the caller is not allowed to see. */
export function NoPermission({ permission, title, action, className }: NoPermissionProps) {
  const { t } = useTranslation(['common', 'permissions']);
  // `branch.view` → `codes.branch.view.name` in the `permissions` namespace.
  const permissionName = permission
    ? t(`permissions:codes.${permission}.name`, { defaultValue: permission })
    : null;
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center gap-3 p-8 text-center', className)}
    >
      <span className="size-control-lg bg-bg-muted text-text-muted inline-flex items-center justify-center rounded-full">
        <Icon name="lock" size={24} />
      </span>
      <p className="text-text text-base font-semibold">{title ?? t('states.noPermissionTitle')}</p>
      <p className="text-text-muted text-sm">
        {permissionName
          ? t('states.noPermissionNeeds', { permission: permissionName })
          : t('states.noPermissionDescription')}
      </p>
      {action ?? null}
    </div>
  );
}
