import { createFileRoute, notFound } from '@tanstack/react-router';

import { DevComponentsPage } from '../features/dev-components/dev-components-page';
import { changeLocale } from '../lib/i18n';

export const Route = createFileRoute('/dev/components')({
  // The sample page exists in development only (plans/03-design-system.md section 7.5).
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router signals "not found" by throwing this object
      throw notFound();
    }
  },
  component: () => <DevComponentsPage onLocaleChange={(locale) => void changeLocale(locale)} />,
});
