'use client';

import { transformError } from '@hive/transaction/lib/transform-error';
import { findMissingAuthority } from '@hive/transaction/lib/missing-authority';
import { findNotEnoughRc } from '@hive/transaction/lib/not-enough-rc';
import { KeychainErrorFallbackTitle } from '@smart-signer/components/keychain-error-fallback-title';
import { MissingAuthorityMessage } from '@smart-signer/components/missing-authority-message';
import { SafeStorageMissingMessage } from '@smart-signer/components/safe-storage-missing-message';
import { SupersededKeyWriteMessage } from '@smart-signer/components/superseded-key-write-message';
import { findSupersededKeyWrite } from '@smart-signer/lib/superseded-key-write';
import { dispatchAuthStorageDesync } from '@smart-signer/lib/auth/auth-storage-desync';
import { NotEnoughRcMessage } from '@smart-signer/components/not-enough-rc-message';
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

/**
 * Perform emergency logout when IndexedDB key storage is lost.
 * This runs outside React — clears cookie, posts to logout API,
 * and dispatches event for React Query to pick up.
 */
function performDesyncLogout(): void {
  // Clear observer cookie immediately — SSR stops personalizing
  document.cookie = 'observer=; path=/; max-age=0';

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

  // POST to logout API to destroy server session (fire and forget)
  // Header value must match csrfHeaderName in @smart-signer/lib/csrf-protection.ts
  fetch(appApiPath('/api/auth/logout'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': '1'
    }
  }).catch(err => logger.error('Desync logout API call failed: %o', err));

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
    logger.error(error, 'Broadcast in %s lacks %s authority', ctx?.method, missingAuthority);
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
    logger.error(error, 'Broadcast in %s rejected for lack of RC', ctx?.method);
    toast({
      description: <NotEnoughRcMessage {...notEnoughRc} />,
      variant: 'destructive',
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
