import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { DEFAULT_STAFF_FILTERS, StaffListPage } from '../../../features/staff/staff-list-page';
import { PermissionGate } from '../../../shared-components/permission-gate';

import type { StaffFilters } from '../../../features/staff/staff-list-page';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  search: z.string().max(60).optional().catch(undefined),
  status: z.enum(['active', 'locked', 'disabled', 'all']).optional().catch(undefined),
  branchId: z.uuid().optional().catch(undefined),
  roleId: z.uuid().optional().catch(undefined),
});

function StaffRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const filters: StaffFilters = {
    page: search.page ?? DEFAULT_STAFF_FILTERS.page,
    search: search.search ?? '',
    status: search.status ?? 'all',
    branchId: search.branchId ?? '',
    roleId: search.roleId ?? '',
  };
  return (
    <PermissionGate permission="user.view">
      <StaffListPage
        filters={filters}
        onFiltersChange={(next) =>
          void navigate({
            to: '/staff',
            search: {
              ...(next.page > 1 ? { page: next.page } : {}),
              ...(next.search ? { search: next.search } : {}),
              ...(next.status === 'all' ? {} : { status: next.status }),
              ...(next.branchId ? { branchId: next.branchId } : {}),
              ...(next.roleId ? { roleId: next.roleId } : {}),
            },
            replace: true,
          })
        }
        onOpen={(id) => void navigate({ to: '/staff/$id', params: { id } })}
        onOpenRoles={() => void navigate({ to: '/roles' })}
      />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/staff/')({
  validateSearch: searchSchema,
  component: StaffRoute,
});
