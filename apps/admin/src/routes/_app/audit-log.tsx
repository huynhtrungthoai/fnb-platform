import { createFileRoute } from '@tanstack/react-router';

import { AuditLogPage } from '../../features/audit/audit-log-page';
import { PermissionGate } from '../../shared-components/permission-gate';

function AuditLogRoute() {
  return (
    <PermissionGate permission="audit.view">
      <AuditLogPage />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/audit-log')({ component: AuditLogRoute });
