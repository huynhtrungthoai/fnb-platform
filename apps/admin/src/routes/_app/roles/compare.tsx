import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { RoleComparePage } from '../../../features/roles/role-compare-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

const searchSchema = z.object({
  a: z.uuid().optional().catch(undefined),
  b: z.uuid().optional().catch(undefined),
});

function CompareRoute() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <PermissionGate permission="role.view">
      <RoleComparePage
        roleA={a}
        roleB={b}
        onChange={(nextA, nextB) =>
          void navigate({
            to: '/roles/compare',
            search: { ...(nextA ? { a: nextA } : {}), ...(nextB ? { b: nextB } : {}) },
            replace: true,
          })
        }
        onBack={() => void navigate({ to: '/roles' })}
        onEdit={(id) => void navigate({ to: '/roles/$id', params: { id } })}
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/roles/compare')({
  validateSearch: searchSchema,
  component: CompareRoute,
});
