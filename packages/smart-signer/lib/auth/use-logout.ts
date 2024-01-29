import { getLogger } from '@hive/ui/lib/logging';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';
import { SignerWif } from '@smart-signer/lib/signer-wif';

const logger = getLogger('app');

export function useLogout() {
    const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);

    const signOut = useSignOut();
    const onLogout = async () => {
      try {
        await signOut.mutateAsync();

        const signerWif = new SignerWif();
        signerWif.removeAllKeys()

        setHiveAuthData(HiveAuthUtils.initialHiveAuthData);
        HiveAuthUtils.logout();
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
