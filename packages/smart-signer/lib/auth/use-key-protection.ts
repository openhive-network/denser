'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from '@ui/config/site';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { KeyType, LoginType, type User } from '@smart-signer/types/common';
import { useProcessAuth } from '@smart-signer/components/auth/process';
import { storedWifKeys } from '@smart-signer/lib/signer/credential-storage';
import {
  SAFE_STORAGE_KEYS_CHANGED_EVENT,
  getSafeStorageKeyTypes,
  notifySafeStorageKeysChanged
} from '@smart-signer/lib/signer/safe-storage-keys';
import {
  PLAINTEXT_KEY_USED_EVENT,
  SAFE_STORAGE_SESSION_REQUESTED_EVENT,
  takeSafeStorageSessionRequest
} from '@smart-signer/lib/signer/key-protection-signals';
import { protectStoredKeys, type KeyProtectionSteps } from '@smart-signer/lib/auth/key-protection';
import { isKeyProtectionSnoozed, snoozeKeyProtection } from '@smart-signer/lib/auth/key-protection-reminder';
import { recordSignInMethod } from '@smart-signer/lib/auth/last-safe-storage-user';
import { getUnlockedSafeStorageUsers } from '@hive/common-hiveio-packages/safe-storage-lock';

const logger = getLogger('app');

export interface KeyProtection {
  /** Whether WIF keys of the user are saved unprotected in this browser */
  hasPlaintextKeys: boolean;
  /** Offers to move them into safe storage now, whether or not the user put it off */
  protect: () => void;
}

const hasStoredKeys = (username: string) => storedWifKeys(window.localStorage, username).length > 0;

/** The steps of `protectStoredKeys` in the browser; the dialogs and hb-auth load only when used */
function browserSteps(username: string): KeyProtectionSteps {
  return {
    storage: window.localStorage,
    async findHeldKeys(keys) {
      // Only safe storage this page already unlocked can tell; hb-auth and wax are not loaded for it
      if (!getUnlockedSafeStorageUsers()?.has(username)) return [];
      try {
        const { findKeysHeldInSafeStorage } = await import('@smart-signer/lib/signer/safe-storage-import-prompt');
        return await findKeysHeldInSafeStorage(username, keys);
      } catch (error) {
        logger.warn(error, 'Cannot tell whether safe storage holds the saved keys of %s', username);
        return [];
      }
    },
    async askToProtect() {
      const { KeyProtectionDialogPromise } = await import('@smart-signer/components/key-protection-dialog');
      return KeyProtectionDialogPromise({ isOpen: true, username });
    },
    async importKeys(keys) {
      const { importWithSafeStoragePassword } = await import('@smart-signer/lib/signer/safe-storage-import-prompt');
      return importWithSafeStoragePassword(username, keys);
    },
    snooze: () => snoozeKeyProtection(username)
  };
}

/**
 * Keeps the signing keys of `user` out of plaintext browser storage. Offers, once per page and at
 * most once a day after "Not now", to move the WIF keys earlier versions saved in plaintext into safe
 * storage: on load and when a signer signs with one. Once they are moved, and when a signer asked
 * for it after keeping a key on the device, a WIF session signs in again through safe storage.
 */
export function useKeyProtection(user: User): KeyProtection {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const { isLoggedIn, username, loginType, keyType } = user;
  const [hasPlaintextKeys, setHasPlaintextKeys] = useState(false);
  const offeredOnThisPage = useRef(new Set<string>());
  const isOffering = useRef(false);
  const processAuth = useProcessAuth(siteConfig.loginAuthenticateOnBackend);
  // Its functions change on every render; the listeners below must not
  const processAuthRef = useRef(processAuth);
  useEffect(() => {
    processAuthRef.current = processAuth;
  });
  const isWifSession = isLoggedIn && loginType === LoginType.wif;

  const signInWithSafeStorage = useCallback(async () => {
    const heldKeyTypes = await getSafeStorageKeyTypes(username);
    const sessionKeyType = heldKeyTypes.find((held) => held === keyType) ?? heldKeyTypes[0];
    if (!sessionKeyType) return;
    const { signAuth, submitAuth } = processAuthRef.current;
    await signAuth({
      loginType: LoginType.hbauth,
      username,
      keyType: sessionKeyType === 'active' ? KeyType.active : KeyType.posting,
      remember: false
    });
    await submitAuth();
    recordSignInMethod(username, LoginType.hbauth);
  }, [keyType, username]);

  const switchToSafeStorage = useCallback(() => {
    signInWithSafeStorage().catch((error: unknown) =>
      logger.error(error, 'Signing in %s through safe storage failed; the WIF session stays', username)
    );
  }, [signInWithSafeStorage, username]);

  const offer = useCallback(
    async (requested: boolean) => {
      if (!isLoggedIn || isOffering.current || !hasStoredKeys(username)) return;
      if (!requested && (offeredOnThisPage.current.has(username) || isKeyProtectionSnoozed(username))) return;
      offeredOnThisPage.current.add(username);
      isOffering.current = true;
      try {
        if ((await protectStoredKeys(username, browserSteps(username))) !== 'moved') return;
        notifySafeStorageKeysChanged();
        toast({ description: t('key_protection.protected'), variant: 'success' });
        if (isWifSession) switchToSafeStorage();
      } catch (error) {
        logger.error(error, 'Moving the saved keys of %s into safe storage failed; they stay saved', username);
        const { handleError } = await import('@ui/lib/handle-error');
        handleError(error, { method: 'protectStoredKeys', params: { username } });
      } finally {
        isOffering.current = false;
        setHasPlaintextKeys(hasStoredKeys(username));
      }
    },
    [isLoggedIn, isWifSession, switchToSafeStorage, t, username]
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    const refresh = () => setHasPlaintextKeys(hasStoredKeys(username));
    refresh();
    void offer(false);
    const onKeyUsed = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === username) void offer(false);
    };
    window.addEventListener(PLAINTEXT_KEY_USED_EVENT, onKeyUsed);
    window.addEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PLAINTEXT_KEY_USED_EVENT, onKeyUsed);
      window.removeEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [isLoggedIn, offer, username]);

  // A signer kept a key on the device: the WIF session, maybe signed in just now, moves to safe storage
  useEffect(() => {
    if (!isWifSession) return;
    if (takeSafeStorageSessionRequest(username)) switchToSafeStorage();
    const onRequest = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === username && takeSafeStorageSessionRequest(username)) {
        switchToSafeStorage();
      }
    };
    window.addEventListener(SAFE_STORAGE_SESSION_REQUESTED_EVENT, onRequest);
    return () => window.removeEventListener(SAFE_STORAGE_SESSION_REQUESTED_EVENT, onRequest);
  }, [isWifSession, switchToSafeStorage, username]);

  const protect = useCallback(() => void offer(true), [offer]);
  return { hasPlaintextKeys, protect };
}
