import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { ApiProvider } from '@fnb/api-client';

import { api, queryClient } from './lib/api';
import { i18n } from './lib/i18n';
import { routeTree } from './route-tree.gen';

import './styles.css';

const router = createRouter({ routeTree, context: { api, queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ApiProvider client={api} queryClient={queryClient}>
        <RouterProvider router={router} />
      </ApiProvider>
    </I18nextProvider>
  </StrictMode>,
);
