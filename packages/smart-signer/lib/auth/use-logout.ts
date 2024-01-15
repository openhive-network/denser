import { getLogger } from '@hive/ui/lib/logging';
import HiveAuthUtils from '@smart-signer/lib/hive-auth-utils';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';

const logger = getLogger('app');

export function useLogout() {
    const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);
    const [, setHiveKeys] = useLocalStorage('hiveKeys', {});

    const signOut = useSignOut();
    const onLogout = async () => {
      setHiveKeys({});
      setHiveAuthData(HiveAuthUtils.initialHiveAuthData);
      HiveAuthUtils.logout();
      try {
        await signOut.mutateAsync();
      } catch (error) {
        logger.error('Error in logout', error);
      }
    };
    return onLogout;
}
