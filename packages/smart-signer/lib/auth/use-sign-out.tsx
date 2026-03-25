import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
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
      // Clear observer cookie immediately — SSR stops personalizing
      document.cookie = 'observer=; path=/; max-age=0';

      // Optimistically update user to logged-out state immediately for instant UI feedback
      const previousUser = queryClient.getQueryData<User>([QUERY_KEY.user]);
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      // Sync localStorage immediately so navigated pages get correct initial data
      // (don't rely on the useEffect in useUserCore which runs after render)
      userLocalStorage.saveUser(defaultUser);
      // Invalidate observer-dependent queries to refetch with default observer
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
      return { previousUser };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData([QUERY_KEY.user], context.previousUser);
        userLocalStorage.saveUser(context.previousUser);
      }
      logger.error(error, 'Sign out failed');
    }
  });
  return signOutMutation;
}
