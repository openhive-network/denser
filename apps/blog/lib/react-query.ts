import { QueryClient, QueryKey, isServer } from '@tanstack/react-query';

/**
 * Stale time constants for different query types.
 * Use these in individual useQuery calls for appropriate freshness.
 */
export const StaleTime = {
  /** For data that rarely changes: communities, static content (5 min) */
  LONG: 5 * 60 * 1000,
  /** For post lists, user profiles (2 min) */
  MEDIUM: 2 * 60 * 1000,
  /** For vote counts, comment counts (30 sec) */
  SHORT: 30 * 1000,
  /** For real-time data: notifications, balances (always refetch) */
  NONE: 0
} as const;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default to 1 minute - individual queries can override with StaleTime constants
        staleTime: 60 * 1000
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Schedule multiple query invalidations with increasing delays.
 * Useful for handling slow blockchain indexing (Hivemind can take 8-30s).
 *
 * Returns a cleanup function to cancel pending invalidations.
 *
 * @param queryClient - The React Query client
 * @param queryKeys - Array of query keys to invalidate
 * @param delays - Array of delays in ms (default: [8000, 16000, 30000])
 */
export function scheduleInvalidations(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  delays: number[] = [8000, 16000, 30000]
): () => void {
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];

  delays.forEach((delay) => {
    const timeoutId = setTimeout(() => {
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    }, delay);
    timeoutIds.push(timeoutId);
  });

  // Return cleanup function
  return () => {
    timeoutIds.forEach((id) => clearTimeout(id));
  };
}

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client.
    // RSC pages pass data to client components via context + initialData,
    // so there's no need to share a QueryClient between RSC and client SSR.
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
