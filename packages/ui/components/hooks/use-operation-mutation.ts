import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { getLogger } from '@ui/lib/logging';
import {
  buildOperationMutationOptions,
  type OperationEffects,
  type OperationMutationConfig
} from '@ui/lib/operation-mutation';

export type { OperationMutationConfig, OperationToast } from '@ui/lib/operation-mutation';

const logger = getLogger('app');

const effects: OperationEffects = {
  notifySuccess: (successToast) => toast({ ...successToast, variant: 'success' }),
  reportError: (error, method, params) => handleError(error, { method, params }),
  logSuccess: (name, data) => logger.info('%s done: %o', name, data)
};

/** Observed broadcast: resolves once the transaction is in a block. */
export const OBSERVE = { observe: true } as const;

/** Wraps `broadcast` so the mutation's data is its variables together with the broadcast result. */
export function withBroadcastResult<TVariables extends object, TResult>(
  broadcast: (variables: TVariables) => Promise<TResult>
) {
  return async (variables: TVariables) => ({ ...variables, broadcastResult: await broadcast(variables) });
}

/**
 * Mutation for one blockchain operation: broadcast through `run`, success toast,
 * error report, optimistic write and rollback, and query refresh on settle.
 */
export function useOperationMutation<TVariables = void, TData = unknown, TContext = unknown>(
  config: OperationMutationConfig<TVariables, TData, TContext>
) {
  const queryClient = useQueryClient();
  return useMutation(buildOperationMutationOptions(queryClient, config, effects));
}
