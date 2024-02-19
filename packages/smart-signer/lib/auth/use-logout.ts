import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { KeyTypes } from '@smart-signer/types/common';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export function useLogout() {

    const signOut = useSignOut();
    const { user } = useUser();

    const { username, loginType } = user;
    const signerOptions: SignerOptions = {
      username,
      loginType,
      keyType: KeyTypes.posting,
      apiEndpoint: 'https://api.hive.blog',
      storageType: 'localStorage',
    };

    const onLogout = async () => {
      try {
        if (user && user.loginType && user.username) {
          const { username } = user;
          const signer = getSigner(signerOptions);
          signer.destroy();
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
