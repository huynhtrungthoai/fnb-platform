import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { RoleEditorPage } from '../../../features/roles/role-editor-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

function NewRoleRoute() {
  const navigate = useNavigate();
  return (
    <PermissionGate permission="role.manage">
      <RoleEditorPage
        roleId={null}
        onBack={() => void navigate({ to: '/roles' })}
        onSaved={(role) =>
          void navigate({ to: '/roles/$id', params: { id: role.id }, replace: true })
        }
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/roles/new')({ component: NewRoleRoute });
