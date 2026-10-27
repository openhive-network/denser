import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { User } from '@smart-signer/types/common';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { setAccounts } from '@smart-signer/lib/auth/active-user';
import { getLogger } from '@ui/lib/logging';
import { appApiPath } from '@ui/lib/app-api-path';
import { beginSignOut, type SignOutAnswer } from '@smart-signer/lib/auth/chat-sign-out';

const logger = getLogger('app');

async function signOutBackend(): Promise<SignOutAnswer> {
  return await fetchJson(appApiPath('/api/auth/logout'), {
    method: 'POST',
    headers: [
      ['content-type', 'application/json'],
      [csrfHeaderName, '1']
    ]
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signOutMutation = useMutation({
    // Whatever the current account, the server session may hold others signed in before it
    mutationFn: signOutBackend,
    onMutate: () => {
      // Recorded before the user changes, which ends the chat drawer's session
      const settleSignOut = beginSignOut();

      // Clear observer cookie immediately — SSR stops personalizing
      document.cookie = 'observer=; path=/; max-age=0';

      // Optimistically update user to logged-out state immediately for instant UI feedback
      const previousUser = queryClient.getQueryData<User>([QUERY_KEY.user]);
      const previousAccounts = userLocalStorage.getAccounts();
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      // Sync localStorage immediately so navigated pages get correct initial data
      // (don't rely on the useEffect in useUserCore which runs after render)
      userLocalStorage.saveUser(defaultUser);
      // Signing out ends the session for every remembered account
      setAccounts(queryClient, []);
      // Invalidate observer-dependent queries to refetch with default observer
      queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
      return { previousUser, previousAccounts, settleSignOut };
    },
    onSuccess: (answer, _variables, context) => {
      context.settleSignOut(answer);
    },
    onError: (error, _variables, context) => {
      context?.settleSignOut(null);
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData([QUERY_KEY.user], context.previousUser);
        userLocalStorage.saveUser(context.previousUser);
        setAccounts(queryClient, context.previousAccounts);
      }
      logger.error(error, 'Sign out failed');
    }
  });
  return signOutMutation;
}
