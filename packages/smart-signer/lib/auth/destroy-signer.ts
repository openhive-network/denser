import { User } from '@smart-signer/types/common';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { clearAccountCredentials, clearAllCredentials } from '@smart-signer/lib/signer/credential-storage';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Delete the credentials stored for `user`, then end the signer session (unlocked keys, tokens) it
 * signed in with. Failures to end the session are logged.
 */
export async function destroyAccountSigner(user: User): Promise<void> {
  const { username, loginType, keyType } = user;
  if (isStorageAvailable('localStorage')) {
    clearAccountCredentials(window.localStorage, username);
  }
  try {
    const { getSigner } = await import('@smart-signer/lib/signer/get-signer');
    const signer = getSigner({ username, loginType, keyType, storageType: 'localStorage' });
    await signer.destroy();
  } catch (error) {
    logger.error(error, 'Failed to destroy signer of %s', username);
  }
}

/** Delete the credentials stored for every account, including those of accounts no longer listed. */
export function clearStoredCredentials(): void {
  if (isStorageAvailable('localStorage')) {
    clearAllCredentials(window.localStorage);
  }
}
