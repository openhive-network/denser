import { QueryClient, QueryKey, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000 // *10,
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
    // Server: always make a new query client
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
