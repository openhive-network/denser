import { getLogger } from '@hive/ui/lib/logging';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { toast } from '@ui/components/hooks/use-toast';

const logger = getLogger('app');

export function useLogout() {
    const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);
    const [, setHiveKeys] = useLocalStorage('hiveKeys', {});

    const signOut = useSignOut();
    const onLogout = async () => {
      try {
        await signOut.mutateAsync();
        setHiveKeys({});
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
