import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { StaffDetailPage } from '../../../features/staff/staff-detail-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

function StaffDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <PermissionGate permission="user.view">
      <StaffDetailPage key={id} userId={id} onBack={() => void navigate({ to: '/staff' })} />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/staff/$id')({
  component: StaffDetailRoute,
});
