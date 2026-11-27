import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { RolesListPage } from '../../../features/roles/roles-list-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

function RolesRoute() {
  const navigate = useNavigate();
  return (
    <PermissionGate permission="role.view">
      <RolesListPage
        onOpen={(id) => void navigate({ to: '/roles/$id', params: { id } })}
        onCreate={() => void navigate({ to: '/roles/new' })}
        onCompare={() => void navigate({ to: '/roles/compare' })}
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/roles/')({ component: RolesRoute });
