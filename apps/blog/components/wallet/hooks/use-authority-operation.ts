import { Dispatch, useCallback, useEffect, useReducer } from 'react';
import { useUpdateAuthorityOperationMutation } from './use-update-authority-mutation';
import { handleAuthorityError, transformKeyAuths } from '@/blog/lib/wallet/utils';
import { useQuery } from '@tanstack/react-query';
import { getAuthority, LevelAuthority } from '@transaction/lib/hive';
import { AccountAuthorityUpdateOperation, WaxError } from '@hiveio/wax';
import { toast } from '@ui/components/hooks/use-toast';

type Actions =
  | { type: 'initializeOperations'; payload: AccountAuthorityUpdateOperation }
  | {
      type: 'add';
      payload: {
        level: Exclude<LevelAuthority, 'memo'>;
        keyOrAccount: string;
        thresholdWeight: number;
      };
    }
  | {
      type: 'delete';
      payload: {
        level: Exclude<LevelAuthority, 'memo'>;
        keyOrAccount: string;
      };
    }
  | {
      type: 'updateMemo';
      payload: {
        memo: string;
      };
    }
  | {
      type: 'updateKeyOrAccount';
      payload: {
        level: Exclude<LevelAuthority, 'memo'>;
        keyOrAccount: string;
        newKeyOrAccount: string;
        newThresholdWeight: number;
      };
    }
  | {
      type: 'updateThreshold';
      payload: {
        level: Exclude<LevelAuthority, 'memo'>;
        threshold: number;
      };
    }
  | {
      type: 'reset';
      payload: {
        level: LevelAuthority;
      };
    };

const getAuthorityState = (operationsData?: AccountAuthorityUpdateOperation) => {
  if (!operationsData) return { authorityLevels: [] };

  const memo = operationsData.role('memo').value;
  let authorityLevels = [];
  for (const role of operationsData.roles('hive') || []) {
    if (role.level !== 'memo') {
      const level = role.level;
      const account_auths = transformKeyAuths(role.value.account_auths);
      const key_auths = transformKeyAuths(role.value.key_auths);
      const weight_threshold = role.value.weight_threshold;
      authorityLevels.push({ level, account_auths, key_auths, weight_threshold });
    }
  }
  return { memo: { value: memo }, authorityLevels };
};

export type AuthorityAction = Dispatch<Actions>;

export const useAuthorityOperations = (username: string) => {
  const { data: operationsData, isLoading } = useQuery(
    ['authority', username],
    () => getAuthority(username),
    {
      enabled: !!username,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: Infinity
    }
  );
  const updateAuthorityMutation = useUpdateAuthorityOperationMutation();

  function reducer(
    state: {
      data: ReturnType<typeof getAuthorityState>;
      operations?: AccountAuthorityUpdateOperation;
      error?: unknown | null;
    },
    action: Actions
  ) {
    let operationError = false;
    if (action.type === 'initializeOperations') {
      return { operations: action.payload, data: getAuthorityState(action.payload) };
    }

    if (!state.operations) {
      console.error("Couldn't retrive authorities");
      return state;
    }
    let error = null;
    try {
      switch (action.type) {
        case 'add': {
          const { level, keyOrAccount, thresholdWeight } = action.payload;
          state.operations.role(level).add(keyOrAccount, thresholdWeight);
          break;
        }
        case 'delete': {
          const { level, keyOrAccount } = action.payload;
          state.operations.role(level).remove(keyOrAccount);
          break;
        }
        case 'updateMemo': {
          const { memo } = action.payload;
          state.operations.role('memo').set(memo);
          break;
        }
        case 'updateKeyOrAccount': {
          const { level, keyOrAccount, newKeyOrAccount, newThresholdWeight } = action.payload;
          state.operations.role(level).replace(keyOrAccount, newThresholdWeight, newKeyOrAccount);
          break;
        }
        case 'updateThreshold': {
          const { level, threshold } = action.payload;
          state.operations.role(level).setTreshold(threshold);
          break;
        }
        case 'reset': {
          const { level } = action.payload;
          state.operations.role(level).reset();
          break;
        }
        default:
          return state;
      }
    } catch (e) {
      console.error(e);
      error = e;
    } finally {
      return { ...state, data: getAuthorityState(state.operations), error };
    }
  }

  const [state, dispatch] = useReducer(reducer, {
    data: getAuthorityState(),
    operations: undefined
  });
  useEffect(() => {
    const e = state.error;
    if (e instanceof WaxError) {
      toast({
        title: 'Error',
        description: e.message,
        variant: 'destructive'
      });
    }
  }, [state.error]);

  useEffect(() => {
    if (operationsData) dispatch({ type: 'initializeOperations', payload: operationsData });
  }, [operationsData]);

  const handleSubmit = useCallback(() => {
    if (state.operations) updateAuthorityMutation.mutate(state.operations);
  }, [state.operations]);

  return {
    state: state,
    actions: dispatch,
    handleSubmit,
    isLoading,
    isSubmitting: updateAuthorityMutation.isLoading,
    error: handleAuthorityError(updateAuthorityMutation),
    submitSuccess: updateAuthorityMutation.isSuccess
  };
};
