import type { QueryClient } from '@tanstack/react-query';
import type { Connectivity } from '@transaction/lib/connectivity';

/**
 * Refetches, once, the active queries that failed while the connection was down when it is back,
 * including when it came back without the browser's `online` event (a node answered again). Never
 * cancels a fetch React Query's own refetch on reconnect already started. Returns the unsubscribe function.
 */
export const retryQueriesOnReconnect = (queryClient: QueryClient, connectivity: Connectivity): (() => void) =>
  connectivity.onChange((connected) => {
    if (!connected) return;
    void queryClient.refetchQueries(
      { type: 'active', predicate: (query) => query.state.status === 'error' },
      { cancelRefetch: false }
    );
  });
