import { MutationCache, QueryCache } from '@tanstack/react-query';
import type {
  Mutation,
  MutationOptions,
  Query,
  QueryClient,
  QueryKey,
  QueryOptions,
  QueryState
} from '@tanstack/react-query';

// A finite cacheTime makes React Query schedule a GC `setTimeout`. On Node every
// timer captures its async context, which holds the request store, so the whole
// request (response, QueryClient, fetched data) stays reachable until the timer
// fires. Removable.updateCacheTime only ever raises cacheTime, so building with
// Infinity keeps later options from lowering it back to a finite value.

/** QueryCache for a request-scoped server QueryClient: its queries never schedule a GC timer. */
export class ServerQueryCache extends QueryCache {
  build<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    client: QueryClient,
    options: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    state?: QueryState<TData, TError>
  ): Query<TQueryFnData, TError, TData, TQueryKey> {
    return super.build(client, { ...options, cacheTime: Infinity }, state);
  }
}

/** MutationCache for a request-scoped server QueryClient: its mutations never schedule a GC timer. */
export class ServerMutationCache extends MutationCache {
  build<TData, TError, TVariables, TContext>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TContext>,
    state?: Mutation<TData, TError, TVariables, TContext>['state']
  ): Mutation<TData, TError, TVariables, TContext> {
    return super.build(client, { ...options, cacheTime: Infinity }, state);
  }
}
