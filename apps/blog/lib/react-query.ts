import { QueryClient, QueryKey, isServer } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Stale time constants for different query types.
 * Use these in individual useQuery calls for appropriate freshness.
 *
 * Note on initialDataUpdatedAt: when using the initialData pattern with SSR,
 * `initialDataUpdatedAt: Date.now()` is evaluated at client render time, not
 * when the data was actually fetched during SSR. The difference is typically
 * under 5 seconds and negligible relative to these stale times.
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

/**
 * Schedule validated refetches for queries with optimistic data.
 *
 * Unlike scheduleInvalidations (which blindly refetches and may overwrite
 * optimistic data with stale API responses), this utility:
 * 1. Fetches data directly via fetchFn (outside React Query cache)
 * 2. Validates whether the response reflects the expected mutation
 * 3. Only updates the cache (via setQueryData) if validation passes
 * 4. Stops scheduling further attempts once validated
 * 5. Never destroys optimistic data — if all retries fail, the optimistic
 *    data persists until natural React Query GC or user navigation
 *
 * Use this for queries that have optimistic updates set via setQueryData
 * in onMutate. For queries without optimistic data, use scheduleInvalidations.
 *
 * @param queryClient - The React Query client
 * @param queryKey - The query key to validate and update
 * @param fetchFn - Function that fetches fresh data from the API directly
 * @param validator - Returns true if the fresh data reflects the expected mutation
 * @param delays - Array of delays in ms (default: [8000, 16000, 30000])
 * @param options - Optional callbacks for validation lifecycle
 * @returns Cleanup function to cancel pending timeouts
 */
export function scheduleValidatedRefetch<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  fetchFn: () => Promise<T>,
  validator: (data: T) => boolean,
  delays: number[] = [8000, 16000, 30000],
  options?: {
    /** Called when validator passes and cache is updated with real data */
    onValidated?: () => void;
    /** Called when all retry attempts fail without destroying optimistic data */
    onExhausted?: () => void;
    /** Extra delays after primary delays for slow indexing (default: [60000, 120000, 240000]) */
    extendedDelays?: number[];
  }
): () => void {
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];
  let validated = false;
  let cancelled = false;
  const allDelays = [...delays, ...(options?.extendedDelays ?? [60000, 120000, 240000])];

  for (const delay of allDelays) {
    const timeoutId = setTimeout(async () => {
      if (validated || cancelled) return;

      try {
        const freshData = await fetchFn();

        if (validated || cancelled) return;

        if (freshData != null && validator(freshData)) {
          validated = true;
          queryClient.setQueryData(queryKey, freshData);
          logger.info('Validated refetch confirmed for key: %o', queryKey);
          options?.onValidated?.();
        }
      } catch (error) {
        logger.error(error, 'Validated refetch failed for key: %o', queryKey);
      }
    }, delay);
    timeoutIds.push(timeoutId);
  }

  // After all retries exhaust, log warning but do NOT invalidate.
  // Optimistic data persists until natural GC or user navigation —
  // this is always preferable to showing "No Data Available" for a
  // confirmed on-chain transaction.
  const exhaustedId = setTimeout(() => {
    if (!validated && !cancelled) {
      logger.warn('Validated refetch exhausted all retries for key: %o', queryKey);
      options?.onExhausted?.();
    }
  }, allDelays[allDelays.length - 1] + 5000);
  timeoutIds.push(exhaustedId);

  return () => {
    cancelled = true;
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
