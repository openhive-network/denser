'use client';

import { useEffect, useRef } from 'react';
import { useSignIn } from '@smart-signer/lib/auth/use-sign-in';
import { LoginType, KeyType } from '@smart-signer/types/common';
import { getCookie } from '@ui/lib/utils';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { getOperationForLogin } from '@smart-signer/lib/login-operation';
import { getChain } from '@transaction/lib/chain';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { Signatures } from '@smart-signer/lib/auth/utils';
import {
  parseAutopost2,
  cleanupCondenserStorage,
  isAlreadyMigrated,
  markMigrated,
  migrateLanguage,
  migrateCondenserData
} from '../lib/condenser-migration';
import { FetchError } from '@smart-signer/lib/fetch-json';
import { getLogger } from '@hive/ui/lib/logging';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// WIF key format (same as signer-wif.ts) and migration cleanup.
/* eslint-disable no-restricted-properties */

const logger = getLogger('app');

/**
 * Invisible component that detects Condenser login data in localStorage
 * and automatically logs the user into Denser.
 *
 * Handles two login methods from Condenser:
 * - WIF key (stored in autopost2 as posting private key)
 * - Keychain (detected via autopost2 flag + extension presence)
 *
 * Runs once on mount, sets a flag to prevent re-execution.
 */
export default function CondenserMigration() {
  const signIn = useSignIn();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    migrate();

    async function migrate() {
      if (isAlreadyMigrated()) return;

      // Language migration runs regardless of login data
      migrateLanguage();

      const data = parseAutopost2();
      if (!data) {
        // No autopost2 means no condenser login — only remove migration markers,
        // not user data (replyEditorData-*, voteWeight-* etc.) which may belong to
        // users who have drafts/templates but never logged in via condenser.
        localStorage.removeItem('autopost2');
        localStorage.removeItem('autopost');
        localStorage.removeItem('saveLogin');
        markMigrated();
        return;
      }

      const { username, postingWif, loginWithKeychain } = data;

      // Migrate user data (templates, drafts, vote weights) before login attempt.
      // These are synchronous and idempotent, so safe to run even if login retries later.
      migrateCondenserData(username);

      // Determine login type: Keychain takes priority (more secure)
      let loginType: LoginType;
      if (loginWithKeychain && hasCompatibleKeychain()) {
        loginType = LoginType.keychain;
      } else if (postingWif && postingWif !== 'none') {
        loginType = LoginType.wif;
        // Store WIF in Denser format so SignerWif can read it
        window.localStorage.setItem(
          `wif.${username}@posting`,
          JSON.stringify(postingWif)
        );
      } else {
        // No usable login method, but data was already migrated above
        cleanupCondenserStorage(username);
        markMigrated();
        return;
      }

      try {
        const loginChallenge = getCookie(`${cookieNamePrefix}login_challenge`);
        if (!loginChallenge) {
          // Middleware should set this on every request. If missing,
          // don't mark migrated so we retry on next page load.
          logger.warn('Condenser migration: no login_challenge cookie');
          removeStoredWif(username, loginType);
          return;
        }

        const hiveChain = await getChain();
        const operation = await getOperationForLogin(
          username,
          KeyType.posting,
          loginChallenge,
          loginType
        );

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
        await signIn.mutateAsync({
          data: {
            username,
            loginType,
            hivesignerToken: '',
            keyType: KeyType.posting,
            txJSON: txBuilder.toApi(),
            pack: signer.pack,
            strict: false,
            signatures,
            authenticateOnBackend: true
          }
        });

        logger.info('Condenser migration: user %s logged in via %s', username, loginType);
        cleanupCondenserStorage(username);
        markMigrated();
      } catch (error) {
        logger.error(error, 'Condenser migration failed for user %s', username);

        // Network errors: don't mark migrated, retry on next page load
        if (isNetworkError(error)) {
          removeStoredWif(username, loginType);
          return;
        }

        // Signing/validation errors: clean up and give up
        removeStoredWif(username, loginType);
        cleanupCondenserStorage(username);
        markMigrated();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
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
