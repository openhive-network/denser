import type { MutationOptions, QueryClient, QueryKey } from '@tanstack/react-query';

export interface OperationToast {
  title?: string;
  description?: string;
  duration?: number;
}

export interface OperationMutationConfig<TVariables, TData, TContext> {
  /** Names the operation in logs and error reports. */
  name: string;
  /** Signs and broadcasts the operation; its result becomes the mutation's data. */
  run: (variables: TVariables) => Promise<TData>;
  /** Optimistic cache write before the broadcast; the returned value is passed to `rollback`. */
  optimistic?: (variables: TVariables, queryClient: QueryClient) => Promise<TContext> | TContext;
  /** Cache write after a successful broadcast. */
  onSuccess?: (data: TData, variables: TVariables, queryClient: QueryClient) => void;
  /** Restores the cache after a failed broadcast. */
  rollback?: (context: TContext | undefined, variables: TVariables, queryClient: QueryClient) => void;
  successToast?: (data: TData, variables: TVariables) => OperationToast;
  /** Query keys refreshed once the mutation settles, whether the broadcast succeeded or failed. */
  invalidate?: (variables: TVariables) => QueryKey[];
  /** When (ms after settling) the `invalidate` keys are refreshed; 0 refreshes at once. */
  invalidateDelays?: number[];
  /** False where the caller reports failures itself. */
  reportErrors?: boolean;
  mutationKey?: QueryKey;
}

/** Side effects outside the query cache, injected so the options stay free of UI imports. */
export interface OperationEffects {
  notifySuccess: (toast: OperationToast) => void;
  reportError: (error: unknown, method: string, params: unknown) => void;
  logSuccess: (name: string, data: unknown) => void;
}

function refreshQueries(queryClient: QueryClient, queryKeys: QueryKey[], delays: number[]): void {
  const refresh = () => queryKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  delays.forEach((delay) => (delay > 0 ? setTimeout(refresh, delay) : refresh()));
}

/** Builds the TanStack mutation options for one blockchain operation. */
export function buildOperationMutationOptions<TVariables, TData, TContext>(
  queryClient: QueryClient,
  config: OperationMutationConfig<TVariables, TData, TContext>,
  effects: OperationEffects
): MutationOptions<TData, unknown, TVariables, TContext> {
  const { name, run, optimistic, onSuccess, rollback, successToast, invalidate } = config;
  const { invalidateDelays = [0], reportErrors = true, mutationKey } = config;
  return {
    mutationKey,
    mutationFn: run,
    onMutate: optimistic && ((variables) => optimistic(variables, queryClient)),
    onSuccess: (data, variables) => {
      effects.logSuccess(name, data);
      if (successToast) effects.notifySuccess(successToast(data, variables));
      onSuccess?.(data, variables, queryClient);
    },
    onError: (error, variables, context) => {
      rollback?.(context, variables, queryClient);
      if (reportErrors) effects.reportError(error, name, variables ?? {});
    },
    onSettled: (_data, _error, variables) => {
      if (invalidate) refreshQueries(queryClient, invalidate(variables), invalidateDelays);
    }
  };
}
