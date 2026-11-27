import { createFileRoute } from '@tanstack/react-router';

import { DevicesPage } from '../../features/devices/devices-page';
import { PermissionGate } from '../../shared-components/permission-gate';

function DevicesRoute() {
  return (
    <PermissionGate permission="device.manage">
      <DevicesPage />
    </PermissionGate>
  );
}

export const Route = createFileRoute('/_app/devices')({ component: DevicesRoute });
