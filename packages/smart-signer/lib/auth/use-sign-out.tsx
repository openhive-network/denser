import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

async function signOutBackend(): Promise<User> {
  return await fetchJson('/api/auth/logout', {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ]
  });
}

async function signOut(user: User): Promise<User> {
  const { authenticateOnBackend } = user;
  if (authenticateOnBackend) {
    return signOutBackend();
  } else {
    return defaultUser;
  }
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signOutMutation = useMutation({
    mutationFn: (params: { user: User }) => {
      const { user } = params;
      return signOut(user);
    },
    onMutate: () => {
      // Optimistically update user to logged-out state immediately for instant UI feedback
      const previousUser = queryClient.getQueryData<User>([QUERY_KEY.user]);
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      // Invalidate observer-dependent queries to refetch with default observer
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
      return { previousUser };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData([QUERY_KEY.user], context.previousUser);
      }
      logger.error(error, 'Sign out failed');
    }
  });
  return signOutMutation;
}
