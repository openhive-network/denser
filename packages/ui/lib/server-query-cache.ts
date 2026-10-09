import { MutationCache, QueryCache } from '@tanstack/react-query';
import type {
  Mutation,
  MutationOptions,
  MutationState,
  Query,
  QueryClient,
  QueryKey,
  QueryOptions,
  QueryState
} from '@tanstack/react-query';

// A finite gcTime makes React Query schedule a GC `setTimeout`. On Node every
// timer captures its async context, which holds the request store, so the whole
// request (response, QueryClient, fetched data) stays reachable until the timer
// fires. Removable.updateGcTime only ever raises gcTime, so building with
// Infinity keeps later options from lowering it back to a finite value.

/** QueryCache for a request-scoped server QueryClient: its queries never schedule a GC timer. */
export class ServerQueryCache extends QueryCache {
  build<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    client: QueryClient,
    options: QueryOptions<TQueryFnData, TError, TData, TQueryKey> & { queryKey: TQueryKey },
    state?: QueryState<TData, TError>
  ): Query<TQueryFnData, TError, TData, TQueryKey> {
    return super.build(client, { ...options, gcTime: Infinity }, state);
  }
}

/** MutationCache for a request-scoped server QueryClient: its mutations never schedule a GC timer. */
export class ServerMutationCache extends MutationCache {
  build<TData, TError, TVariables, TOnMutateResult>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TOnMutateResult>,
    state?: MutationState<TData, TError, TVariables, TOnMutateResult>
  ): Mutation<TData, TError, TVariables, TOnMutateResult> {
    return super.build(client, { ...options, gcTime: Infinity }, state);
  }
}
