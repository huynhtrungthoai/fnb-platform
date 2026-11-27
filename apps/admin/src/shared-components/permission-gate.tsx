import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button, NoPermission, usePermission } from '@fnb/ui-web';

import type { PermissionCode } from '@fnb/contract';
import type { ReactNode } from 'react';

export interface PermissionGateProps {
  permission: PermissionCode;
  children: ReactNode;
}

/**
 * The permission a screen needs (06 section 7.2): opening its URL without it, or losing it while
 * the screen is open, shows `NoPermission` instead.
 */
export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  if (usePermission(permission)) {
    return children;
  }
  return (
    <NoPermission
      permission={permission}
      action={<Button onClick={() => void navigate({ to: '/' })}>{t('app.backHome')}</Button>}
    />
  );
}
