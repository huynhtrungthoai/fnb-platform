import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { RoleEditorPage } from '../../../features/roles/role-editor-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

function RoleRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <PermissionGate permission="role.view">
      <RoleEditorPage
        key={id}
        roleId={id}
        onBack={() => void navigate({ to: '/roles' })}
        onSaved={() => undefined}
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/roles/$id')({ component: RoleRoute });
