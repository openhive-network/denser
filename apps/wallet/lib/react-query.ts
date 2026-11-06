import { QueryClient, isServer } from '@tanstack/react-query';
import { ServerMutationCache, ServerQueryCache } from '@ui/lib/server-query-cache';
import { retryQueriesOnApiNodeSwitch } from '@ui/lib/retry-queries-on-api-node-switch';
import { retryQueriesOnReconnect } from '@ui/lib/retry-queries-on-reconnect';
import { getBrowserConnectivity } from '@transaction/lib/connectivity';

function makeQueryClient() {
  return new QueryClient({
    ...(isServer && { queryCache: new ServerQueryCache(), mutationCache: new ServerMutationCache() }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // Queries pause while the browser is offline; once it is back, the page's data refreshes once.
        refetchOnReconnect: 'always'
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
      retryQueriesOnApiNodeSwitch(browserQueryClient);
      const connectivity = getBrowserConnectivity();
      if (connectivity) retryQueriesOnReconnect(browserQueryClient, connectivity);
    }
    return browserQueryClient;
  }
}
