import { useQueryClient } from '@tanstack/react-query';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useSigner } from '@smart-signer/lib/use-signer';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { getLogger } from '@hive/ui/lib/logging';
import { useRouter } from 'next/navigation';

const logger = getLogger('app');

export function useLogout(redirect?: string) {
  const signOut = useSignOut();
  const { user } = useUser();
  const { signerOptions } = useSigner();
  const router = useRouter();
  const queryClient = useQueryClient();

  const onLogout = async () => {
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

    // Run cleanup operations in background (fire and forget)
    if (user && user.isLoggedIn) {
      // Signer cleanup
      Promise.resolve().then(async () => {
        try {
          const signer = getSigner(signerOptions);
          await signer.destroy();
        } catch (error) {
          logger.error(error, 'Failed to destroy signer during logout');
        }
      });
    }
  };
  return onLogout;
}
