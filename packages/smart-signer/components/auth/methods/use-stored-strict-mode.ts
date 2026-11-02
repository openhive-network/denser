import { useEffect, useState } from 'react';
import type { KeyAuthorityType } from '@hiveio/hb-auth';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { storedStrictMode } from '@smart-signer/lib/signer/safe-storage-registration';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * The Direct Authority Mode safe storage unlocks the `keyType` key of `username` with; undefined
 * while it is read, when safe storage holds no such account (`username` undefined), or when the
 * read fails.
 */
export function useStoredStrictMode(username: string | undefined, keyType: KeyAuthorityType): boolean | undefined {
  const [strict, setStrict] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setStrict(undefined);
    if (!username) return;
    let current = true;
    (async () => {
      try {
        const settings = await (await hbauthService.getOnlineClient()).getUserSettings(username);
        if (current) setStrict(storedStrictMode(settings, keyType));
      } catch (error) {
        logger.error(error, 'Failed to read the Direct Authority Mode of %s', username);
      }
    })();
    return () => {
      current = false;
    };
  }, [username, keyType]);

  return strict;
}
