import { getLogger } from '@hive/ui/lib/logging';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';
import { Signer } from '@smart-signer/lib/signer';
import { useUser } from '@smart-signer/lib/auth/use-user';

const logger = getLogger('app');

export function useLogout() {

    const signOut = useSignOut();
    const { user } = useUser();
    const signer = new Signer();

    const onLogout = async () => {
      try {
        if (user && user.loginType) {
          signer.destroy(user.loginType);
        }
        await signOut.mutateAsync();
      } catch (error) {
        toast({
          title: 'Error!',
          description: 'Logout failed',
          variant: 'destructive'
        });
        logger.error('Error in logout', error);
      }
    };
    return onLogout;
}
