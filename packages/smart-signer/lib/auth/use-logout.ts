import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useSigner } from '@smart-signer/lib/use-signer';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@hive/ui/lib/logging';
import { useRouter } from 'next/navigation';

const logger = getLogger('app');

export function useLogout(redirect?: string) {
  const signOut = useSignOut();
  const { user } = useUser();
  const { signerOptions } = useSigner();
  const router = useRouter();

  const onLogout = async () => {
    // Delete auth_proof cookie immediately
    document.cookie = 'auth_proof=; path=/; max-age=0';

    // Trigger sign out mutation - this updates UI immediately via optimistic update
    signOut.mutate({ user });

    // Redirect immediately if specified
    if (redirect) {
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
