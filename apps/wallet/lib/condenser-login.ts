import { LoginType, KeyType } from '@smart-signer/types/common';
import { getCookie } from '@ui/lib/utils';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { getOperationForLogin } from '@smart-signer/lib/login-operation';
import { getChain } from '@transaction/lib/chain';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import type { Signatures, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { FetchError } from '@smart-signer/lib/fetch-json';
import { getLogger } from '@hive/ui/lib/logging';
import { cleanupCondenserStorage, markMigrated, type CondenserLoginData } from './condenser-migration';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// WIF key format (same as signer-wif.ts).
/* eslint-disable no-restricted-properties */

const logger = getLogger('app');

/**
 * Logs a user migrating from Condenser wallet into Denser wallet, by Keychain or with the posting
 * key Condenser stored. Signs a login challenge with wax, so it is loaded only when there is
 * Condenser login data. Marks the migration done unless it should be retried on the next page load.
 */
export async function loginCondenserUser(
  { username, postingWif, loginWithKeychain }: CondenserLoginData,
  signIn: (data: PostLoginSchema) => Promise<unknown>
): Promise<void> {
  // Determine login type: Keychain takes priority (more secure)
  let loginType: LoginType;
  if (loginWithKeychain && hasCompatibleKeychain()) {
    loginType = LoginType.keychain;
  } else if (postingWif && postingWif !== 'none') {
    loginType = LoginType.wif;
    // Store WIF in Denser format so SignerWif can read it
    window.localStorage.setItem(`wif.${username}@posting`, JSON.stringify(postingWif));
  } else {
    // No usable login method
    cleanupCondenserStorage();
    markMigrated();
    return;
  }

  try {
    const loginChallenge = getCookie(`${cookieNamePrefix}login_challenge`);
    if (!loginChallenge) {
      // Middleware should set this on every request. If missing,
      // don't mark migrated so we retry on next page load.
      logger.warn('Condenser wallet migration: no login_challenge cookie');
      removeStoredWif(username, loginType);
      return;
    }

    const hiveChain = await getChain();
    const operation = await getOperationForLogin(username, KeyType.posting, loginChallenge, loginType);

    const expr = new Date();
    expr.setHours(expr.getHours() + 1);
    const txBuilder = await hiveChain.createTransaction(expr);
    txBuilder.pushOperation(operation);
    txBuilder.validate();

    const signer = getSigner({
      username,
      loginType,
      keyType: KeyType.posting,
      storageType: 'localStorage'
    });

    const signature = await signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.transaction
    });

    txBuilder.addSignature(signature);
    const signatures: Signatures = { posting: signature, active: '' };

    // Complete login: sets iron-session cookie, updates React Query
    await signIn({
      username,
      loginType,
      hivesignerToken: '',
      keyType: KeyType.posting,
      txJSON: txBuilder.toApi(),
      pack: signer.pack,
      strict: false,
      signatures,
      authenticateOnBackend: true
    });

    logger.info('Condenser wallet migration: user %s logged in via %s', username, loginType);
    cleanupCondenserStorage();
    markMigrated();
  } catch (error) {
    logger.error(error, 'Condenser wallet migration failed for user %s', username);

    // Network errors: don't mark migrated, retry on next page load
    if (isNetworkError(error)) {
      removeStoredWif(username, loginType);
      return;
    }

    // Signing/validation errors: clean up and give up
    removeStoredWif(username, loginType);
    cleanupCondenserStorage();
    markMigrated();
  }
}

function isNetworkError(error: unknown): boolean {
  // fetch() throws TypeError on network failure
  if (error instanceof TypeError) return true;
  // AbortError from fetch timeout
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  // FetchError with 5xx status (server issues, not client errors)
  if (error instanceof FetchError && error.response.status >= 500) return true;
  return false;
}

function removeStoredWif(username: string, loginType: LoginType): void {
  if (loginType === LoginType.wif) {
    window.localStorage.removeItem(`wif.${username}@posting`);
  }
}
