import { useEffect, useState } from 'react';
import type { OnlineClient } from '@hiveio/hb-auth';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { readShownActiveCheck } from '@smart-signer/lib/auth/shown-active-check';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

type ReadSetting = (client: OnlineClient, username: string) => Promise<boolean | undefined>;

async function readVerifiedSetting(client: OnlineClient, username: string): Promise<boolean | undefined> {
  if (!(await client.getRegisteredUserByUsername(username))?.unlocked) return undefined;
  return client.getRequireActiveCheck(username);
}

/** The setting `read` gives for `username`, a setter for a value a change made known; undefined while read, without `username` or when the read fails */
function useSetting(
  username: string | undefined,
  read: ReadSetting
): [boolean | undefined, (requireActiveCheck: boolean) => void] {
  const [requireActiveCheck, setRequireActiveCheck] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setRequireActiveCheck(undefined);
    if (!username) return;
    let current = true;
    (async () => {
      try {
        const setting = await read(await hbauthService.getOnlineClient(), username);
        if (current) setRequireActiveCheck(setting);
      } catch (error) {
        logger.error(error, 'Failed to read whether safe storage of %s asks before active-key operations', username);
      }
    })();
    return () => {
      current = false;
    };
  }, [username, read]);

  return [requireActiveCheck, setRequireActiveCheck];
}

/**
 * Whether the safe-storage wallet of `username` asks for the password or a passkey before every
 * operation that needs its active or owner key, and a setter for the value a change made known;
 * undefined while it is read, without `username`, when the read fails, or while the wallet is
 * locked: hb-auth verifies the setting only in an unlocked wallet, and reads a wallet from before
 * the setting as on until an unlock adopts it as off.
 */
export function useActiveCheckSetting(
  username: string | undefined
): [boolean | undefined, (requireActiveCheck: boolean) => void] {
  return useSetting(username, readVerifiedSetting);
}

/**
 * The same setting for text describing it, read also from a locked wallet (`readShownActiveCheck`);
 * undefined while it is read, without `username` or when the read fails
 */
export function useShownActiveCheck(username: string | undefined): boolean | undefined {
  return useSetting(username, readShownActiveCheck)[0];
}
