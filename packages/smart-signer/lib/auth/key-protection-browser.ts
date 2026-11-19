import { getLogger } from '@ui/lib/logging';
import { forgetStoredWifKeys } from '@smart-signer/lib/signer/credential-storage';
import { forgetTabWifKeys } from '@smart-signer/lib/signer/tab-credentials';
import { notifySafeStorageKeysChanged } from '@smart-signer/lib/signer/safe-storage-keys';
import {
  hasStoredKeys,
  protectStoredKeys,
  type KeyProtectionSteps,
  type LeaveStoredKeysSteps
} from '@smart-signer/lib/auth/key-protection';
import { snoozeKeyProtection } from '@smart-signer/lib/auth/key-protection-reminder';
import { getUnlockedSafeStorageUsers } from '@hive/common-hiveio-packages/safe-storage-lock';

const logger = getLogger('app');

/** What deletes the saved keys: signing out, or removing an account from the session */
export type LeaveKind = 'signOut' | 'removeAccount';

/** Whether a WIF key of `username` is saved unprotected in this browser */
export const hasSavedKeys = (username: string) => hasStoredKeys(window.localStorage, username);

/** Asks to confirm forgetting saved keys: true once confirmed */
async function confirmForget(): Promise<boolean> {
  const { ForgetSavedKeyDialogPromise } = await import('@smart-signer/components/forget-saved-key-dialog');
  return ForgetSavedKeyDialogPromise({ isOpen: true });
}

/** The steps of `protectStoredKeys` in the browser; the dialogs and hb-auth load only when used */
export function browserSteps(username: string): KeyProtectionSteps {
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
    confirmForget,
    async importKeys(keys) {
      const { importWithSafeStoragePassword } = await import('@smart-signer/lib/signer/safe-storage-import-prompt');
      return importWithSafeStoragePassword(username, keys);
    },
    snooze: () => snoozeKeyProtection(username)
  };
}

/**
 * Forgets the keys of `username` this browser keeps: those saved unprotected and those remembered
 * for this tab, so the next operation asks for the key. Asks to confirm first; resolves whether it
 * was confirmed.
 */
export async function forgetSavedKeys(username: string): Promise<boolean> {
  if (!(await confirmForget())) return false;
  forgetStoredWifKeys(window.localStorage, username);
  forgetTabKeysOnceSavedForgotten(username);
  return true;
}

/** Once the saved keys of `username` are forgotten, forgets those this tab remembers too, so the next operation asks */
export function forgetTabKeysOnceSavedForgotten(username: string): void {
  forgetTabWifKeys(username);
  notifySafeStorageKeysChanged();
}

/** The steps of `settleStoredKeysBeforeLeaving` in the browser, before `kind`; `onProtected` once keys moved */
export function leaveSteps(kind: LeaveKind, onProtected: () => void): LeaveStoredKeysSteps {
  return {
    storage: window.localStorage,
    async askBeforeLeaving(usernames) {
      const { LeaveSavedKeyDialogPromise } = await import('@smart-signer/components/leave-saved-key-dialog');
      return LeaveSavedKeyDialogPromise({ isOpen: true, usernames, kind });
    },
    async protect(username) {
      // Chosen in the leave dialog already; a closed password prompt cancels leaving, not asking again
      const outcome = await protectStoredKeys(username, {
        ...browserSteps(username),
        askToProtect: async () => 'protect',
        snooze: () => undefined
      });
      if (outcome === 'moved') {
        notifySafeStorageKeysChanged();
        onProtected();
      }
      return outcome;
    }
  };
}
