import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useSigner } from '@smart-signer/lib/use-signer';
import { getLogger } from '@hive/ui/lib/logging';
import { useRouter } from 'next/navigation';

const logger = getLogger('app');

export function useLogout(redirect?: string) {
  const signOut = useSignOut();
  const { user } = useUser();
  const { signerOptions } = useSigner();
  const router = useRouter();

  const onLogout = async () => {
    try {
      if (user && user.isLoggedIn) {
        const signer = getSigner(signerOptions);
        await signer.destroy();

        // Log logout event to the backend
        try {
          await fetch('/api/auth/log_account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'logout'
              // username and loginType will be read from the existing cookie
            })
          });
        } catch (logError) {
          logger.error(logError, 'Failed to log logout event');
        }
      }
      await signOut.mutateAsync({ user });
      // Delete auth_proof cookie
      document.cookie = 'auth_proof=; path=/; max-age=0';
    } catch (error) {
      toast({
        title: 'Error!',
        description: 'Logout failed',
        variant: 'destructive'
      });
      logger.error(error, 'Error in logout');
    } finally {
      if (redirect) {
        router.push(redirect);
      }
    }
  };
  return onLogout;
}
