import { meQueryOptions } from '@fnb/api-client';

import type { RouterContext } from '../routes/__root';
import type { Me } from '@fnb/contract';

/**
 * The signed-in user for a route guard: from the cache while fresh, otherwise from the API.
 * `null` when signed out.
 */
export function loadMe(context: RouterContext): Promise<Me | null> {
  return context.queryClient.query(meQueryOptions(context.api.auth));
}
