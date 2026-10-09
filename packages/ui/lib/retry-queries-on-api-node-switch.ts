import type { QueryClient } from '@tanstack/react-query';
import { onApiNodeSwitch } from '@transaction/lib/api-node-switch';

/**
 * Refetches the active queries that failed when the browser switches to another API node after
 * the selected one went down, so pages that showed an error load their data from the new node.
 * Returns the unsubscribe function.
 */
export const retryQueriesOnApiNodeSwitch = (queryClient: QueryClient): (() => void) =>
  onApiNodeSwitch(() => {
    void queryClient.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' });
  });
