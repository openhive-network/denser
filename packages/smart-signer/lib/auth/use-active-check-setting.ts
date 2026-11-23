import { useEffect, useState } from 'react';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Whether the safe-storage wallet of `username` asks for the password or a passkey before every
 * operation that needs its active or owner key, and a setter for the value a change made known;
 * undefined while it is read, without `username`, or when the read fails.
 */
export function useActiveCheckSetting(
  username: string | undefined
): [boolean | undefined, (requireActiveCheck: boolean) => void] {
  const [requireActiveCheck, setRequireActiveCheck] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setRequireActiveCheck(undefined);
    if (!username) return;
    let current = true;
    (async () => {
      try {
        const setting = await (await hbauthService.getOnlineClient()).getRequireActiveCheck(username);
        if (current) setRequireActiveCheck(setting);
      } catch (error) {
        logger.error(error, 'Failed to read whether safe storage of %s asks before active-key operations', username);
      }
    })();
    return () => {
      current = false;
    };
  }, [username]);

  return [requireActiveCheck, setRequireActiveCheck];
}
