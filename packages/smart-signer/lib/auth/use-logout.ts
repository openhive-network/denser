import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useSigner } from '@smart-signer/lib/use-signer';
import { getLogger } from '@hive/ui/lib/logging';
import { useRouter } from 'next/router';

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
      }
      await signOut.mutateAsync({ user });
    } catch (error) {
      toast({
        title: 'Error!',
        description: 'Logout failed',
        variant: 'destructive'
      });
      logger.error('Error in logout', error);
    } finally {
      if (redirect) {
        router.push(redirect);
      }
    }
  };
  return onLogout;
}
