import { User } from '@smart-signer/types/common';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import {
  clearAccountCredentials,
  clearAllCredentials,
  clearStoredDriveEncryptionKeys
} from '@smart-signer/lib/signer/credential-storage';
import { forgetAllTabCredentials, forgetTabCredentials } from '@smart-signer/lib/signer/tab-credentials';
import { subscribeLogout } from '@smart-signer/lib/auth/logout-notice';
import { subscribeAccountsChanged } from '@smart-signer/lib/auth/account-sync';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Delete the credentials stored for `user` and the keys this tab keeps for it, then end the signer
 * session (unlocked keys, tokens) it signed in with. Failures to end the session are logged.
 */
export async function destroyAccountSigner(user: User): Promise<void> {
  const { username, loginType, keyType } = user;
  forgetTabCredentials(username);
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

/**
 * Delete the credentials stored for every account, including those of accounts no longer listed,
 * and the keys this tab keeps for them.
 */
export function clearStoredCredentials(): void {
  forgetAllTabCredentials();
  if (isStorageAvailable('localStorage')) {
    clearAllCredentials(window.localStorage);
  }
}

/**
 * Remove the Google Drive wallet encryption keys earlier versions stored, of every account: the key
 * is kept in the page's memory only now.
 */
export function clearStoredDriveKeys(): void {
  if (isStorageAvailable('localStorage')) {
    clearStoredDriveEncryptionKeys(window.localStorage);
  }
}

// A logout or an account removal in another tab ends those sessions here too: the keys this tab
// keeps for them must not sign once they are signed out. Not on the server, which has no tabs.
if (typeof window !== 'undefined') {
  subscribeLogout(forgetAllTabCredentials);
  subscribeAccountsChanged(({ removedUsername }) => {
    if (removedUsername) forgetTabCredentials(removedUsername);
  });
}
