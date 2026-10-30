'use client';

import { summarizeErrorForLog, transformError } from '@hive/transaction/lib/transform-error';
import { findMissingAuthority } from '@hive/transaction/lib/missing-authority';
import { findNotEnoughRc } from '@hive/transaction/lib/not-enough-rc';
import { SignedOutError } from '@hive/transaction/lib/signed-out';
import { TransactionNotConfirmedError } from '@hive/transaction/lib/transaction-inclusion';
import { KeychainErrorFallbackTitle } from '@smart-signer/components/keychain-error-fallback-title';
import { MissingAuthorityMessage } from '@smart-signer/components/missing-authority-message';
import { SafeStorageMissingMessage } from '@smart-signer/components/safe-storage-missing-message';
import { SignedOutMessage } from '@smart-signer/components/signed-out-message';
import { SupersededKeyWriteMessage } from '@smart-signer/components/superseded-key-write-message';
import { findSupersededKeyWrite } from '@smart-signer/lib/superseded-key-write';
import { dispatchAuthStorageDesync } from '@smart-signer/lib/auth/auth-storage-desync';
import { announceLogoutDone, clearLogoutDone } from '@smart-signer/lib/auth/logout-done';
import { NotEnoughRcMessage } from '@smart-signer/components/not-enough-rc-message';
import { RequestTimeoutMessage } from '@smart-signer/components/request-timeout-message';
import { TransactionNotConfirmedMessage } from '@smart-signer/components/transaction-not-confirmed-message';
import { FetchTimeoutError } from '@smart-signer/lib/fetch-json';
import ErrorToastContent from '@ui/components/error-toast-content';
import { toast, Toast } from '@ui/components/hooks/use-toast';
import env from "@beam-australia/react-env";
import { getLogger } from '@ui/lib/logging';
import { appApiPath } from '@ui/lib/app-api-path';
import { isUserCancelled } from '@ui/lib/user-cancelled';

const logger = getLogger('app');

/** Pattern for auth storage desync (IndexedDB cleared while session cookie remains) */
const AUTH_STORAGE_DESYNC_PATTERN = /Auth for user .+ not found|AuthStorageMissingError/i;

function isAuthStorageDesync(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error && error.name === 'AuthStorageMissingError') {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return AUTH_STORAGE_DESYNC_PATTERN.test(msg);
}

/** The desync logout whose answer has not come yet: one desync can reach the error handler more than once */
let pendingDesyncLogout: Promise<void> | null = null;

/**
 * Perform emergency logout when IndexedDB key storage is lost.
 * This runs outside React — clears cookie, posts to logout API,
 * and dispatches event for React Query to pick up.
 * Does nothing while an earlier one waits for its answer.
 */
function performDesyncLogout(): void {
  if (pendingDesyncLogout) return;

  // Clear observer cookie immediately — SSR stops personalizing
  document.cookie = 'observer=; path=/; max-age=0';

  // Before the signed-out user reaches other tabs, so they wait for this logout's answer
  clearLogoutDone();

  // Clear user from localStorage so next page load starts logged out
  try {
    const defaultUser = JSON.stringify({
      isLoggedIn: false,
      username: '',
      avatarUrl: '',
      loginType: 'hbauth',
      keyType: 'posting',
      authenticateOnBackend: false
    });
    localStorage.setItem('user', defaultUser);
  } catch {
    // localStorage may be unavailable — cookie clear is sufficient
  }

  // POST to logout API to destroy server session (fire and forget); other tabs go on on its answer
  // Header value must match csrfHeaderName in @smart-signer/lib/csrf-protection.ts
  pendingDesyncLogout = fetch(appApiPath('/api/auth/logout'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': '1'
    }
  })
    .then(() => undefined)
    .catch(err => logger.error('Desync logout API call failed: %o', err))
    .finally(() => {
      pendingDesyncLogout = null;
      announceLogoutDone();
    });

  // Dispatch event so React Query invalidates user state
  dispatchAuthStorageDesync();
}

// A dynamic import() keeps the Sentry SDK out of the initial chunks of every page that can show an error toast.
function reportToSentry(error: unknown): void {
  import('@sentry/nextjs')
    .then(({ captureException }) => captureException(error))
    .catch(importError => logger.error('Loading Sentry to report an error failed: %o', importError));
}

export function handleError<T>(error: unknown, ctx?: { method: string; params: T }, toastOptions?: Toast) {
  // User-cancelled operations (dismissed password dialog) — silently ignore
  if (isUserCancelled(error)) {
    logger.info('User cancelled operation in %s — no toast', ctx?.method);
    return;
  }

  // Signed out, here or in another tab, before the operation was signed: nothing was signed or sent
  if (error instanceof SignedOutError) {
    logger.info('Signed out before signing in %s — asking to sign in', ctx?.method);
    toast({
      description: <SignedOutMessage />,
      variant: 'destructive',
      ...toastOptions
    });
    return;
  }

  // Auth storage desync: IndexedDB cleared but session cookie remains.
  // Auto-logout and show friendly message instead of cryptic error.
  if (isAuthStorageDesync(error)) {
    logger.warn('Auth storage desync detected in %s — triggering auto-logout', ctx?.method);
    performDesyncLogout();
    toast({
      description: <SafeStorageMissingMessage />,
      variant: 'default',
      ...toastOptions
    });
    return;
  }

  // Another tab interrupted saving a key to safe storage: say which key to add again
  const supersededKeyWrite = findSupersededKeyWrite(error);
  if (supersededKeyWrite) {
    logger.error(error, 'Key write in %s was superseded by another app', ctx?.method);
    toast({
      description: <SupersededKeyWriteMessage {...supersededKeyWrite} />,
      variant: 'destructive',
      ...toastOptions
    });
    return;
  }

  // A broadcast signed with too weak a key: say which key it needs, keep the node's answer in the log only
  const missingAuthority = findMissingAuthority(error);
  if (missingAuthority) {
    logger.error('Broadcast in %s lacks %s authority: %s', ctx?.method, missingAuthority, summarizeErrorForLog(error));
    logger.debug(error, 'Broadcast in %s lacks %s authority', ctx?.method, missingAuthority);
    toast({
      description: <MissingAuthorityMessage role={missingAuthority} />,
      variant: 'destructive',
      ...toastOptions
    });
    return;
  }

  // The account is short of Resource Credits: say so with the node's amounts, keep its answer in the log only
  const notEnoughRc = findNotEnoughRc(error);
  if (notEnoughRc) {
    logger.error('Broadcast in %s rejected for lack of RC: %s', ctx?.method, summarizeErrorForLog(error));
    logger.debug(error, 'Broadcast in %s rejected for lack of RC', ctx?.method);
    toast({
      description: <NotEnoughRcMessage {...notEnoughRc} />,
      variant: 'destructive',
      ...toastOptions
    });
    return;
  }

  // The app's server did not answer in time: ask for a retry, keep where and how long it waited in the log
  if (error instanceof FetchTimeoutError) {
    logger.error(
      error,
      'Request in %s to %s timed out after %d ms (limit %d ms)',
      ctx?.method,
      error.url,
      error.elapsedMs,
      error.timeoutMs
    );
    toast({
      description: <RequestTimeoutMessage />,
      variant: 'destructive',
      ...toastOptions
    });
    return;
  }

  // The node took the transaction, no block was seen to include it yet: it may still apply, so no error
  if (error instanceof TransactionNotConfirmedError) {
    logger.warn('Transaction %s in %s not confirmed in time', error.transactionId, ctx?.method);
    toast({
      description: <TransactionNotConfirmedMessage />,
      variant: 'default',
      ...toastOptions
    });
    return;
  }

  const { errorTitle, fullError, isWellKnownError, isKeychainMessageMissing } = transformError<T>(error, ctx);

  if (!!env('SENTRY_DSN') && !isWellKnownError)
    reportToSentry(fullError);

  toast({
    description: (
      <ErrorToastContent
        errorTitle={isKeychainMessageMissing ? <KeychainErrorFallbackTitle /> : errorTitle}
        fullError={fullError}
        displayControls={!isWellKnownError}
      />
    ),
    variant: 'destructive',
    ...toastOptions
  });
}
