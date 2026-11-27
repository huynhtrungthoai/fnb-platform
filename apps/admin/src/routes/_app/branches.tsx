import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { BranchesPage } from '../../features/branches/branches-page';
import { PermissionGate } from '../../shared-components/permission-gate';

const searchSchema = z.object({ id: z.uuid().optional().catch(undefined) });

function BranchesRoute() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <PermissionGate permission="branch.view">
      <BranchesPage
        selectedId={id}
        onSelect={(branchId) => void navigate({ to: '/branches', search: { id: branchId } })}
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/branches')({
  validateSearch: searchSchema,
  component: BranchesRoute,
});
