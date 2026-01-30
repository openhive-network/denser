import { useQueryClient } from '@tanstack/react-query';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useSigner } from '@smart-signer/lib/use-signer';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
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
    // Delete auth_proof cookie immediately
    document.cookie = 'auth_proof=; path=/; max-age=0';

    // Trigger sign out mutation - this updates UI immediately via optimistic update
    signOut.mutate({ user });

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

      // Log logout event to the backend
      fetch('/api/auth/log_account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [csrfHeaderName]: '1'
        },
        body: JSON.stringify({
          type: 'logout'
          // username and loginType will be read from the existing cookie
        })
      }).catch((logError) => {
        logger.error(logError, 'Failed to log logout event');
      });
    }
  };
  return onLogout;
}
