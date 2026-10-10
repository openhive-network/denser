import { useQueryClient } from '@tanstack/react-query';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { useUser } from '@smart-signer/lib/auth/use-user';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { findAccount } from '@smart-signer/lib/auth/accounts';
import { destroyAccountSigner } from '@smart-signer/lib/auth/destroy-signer';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { useRouter } from 'next/navigation';

export function useLogout(redirect?: string) {
  const signOut = useSignOut();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const onLogout = async () => {
    // Read before signing out clears them
    const remembered = userLocalStorage.getAccounts();
    const accounts =
      user.isLoggedIn && !findAccount(remembered, user.username) ? [...remembered, user] : remembered;

    // Clear observer cookie immediately — SSR stops personalizing
    document.cookie = 'observer=; path=/; max-age=0';

    // Trigger sign out mutation and wait for server response to ensure
    // the Set-Cookie header (which clears iron-session) is processed
    // before any navigation occurs.
    try {
      await signOut.mutateAsync({ user });
    } catch {
      // Server logout may have failed, but proceed with local cleanup.
      // onMutate already applied optimistic update; onError may have rolled
      // it back, but navigation below will load fresh state from the server.
    }

    // Redirect immediately if specified
    if (redirect) {
      // Clear all non-user queries to force loading states on the current page.
      // This provides instant visual feedback while the navigation completes,
      // preventing stale page content from being visible during the redirect.
      queryClient.removeQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
          return firstKey !== QUERY_KEY.user;
        }
      });
      router.push(redirect);
    }

    // Signer cleanup for every account the session ended, in background (fire and forget)
    for (const account of accounts) {
      void destroyAccountSigner(account);
    }
  };
  return onLogout;
}
