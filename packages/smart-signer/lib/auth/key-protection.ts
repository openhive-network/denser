import type { KeyAuthorityType } from '@hiveio/hb-auth';
import {
  forgetStoredWifKeys,
  removeStoredWifKeys,
  storedWifKeys
} from '@smart-signer/lib/signer/credential-storage';
import type { WifKey } from '@smart-signer/lib/signer/safe-storage-import';

/**
 * How offering to protect the plaintext WIF keys of an account ended: `none` stored; `moved` into
 * safe storage, every one of them, and removed; `forgotten`, removed once the user confirmed
 * "Forget saved key"; `snoozed` when the user chose "Not now" or closed the password prompt,
 * leaving them stored.
 */
export type KeyProtectionOutcome = 'none' | 'moved' | 'forgotten' | 'snoozed';

/** The answer to the "saved unprotected" dialog; a closed dialog is `notNow` */
export type KeyProtectionChoice = 'protect' | 'notNow' | 'forget';

/** The answer to the dialog asked before signing out or removing an account with saved keys */
export type LeaveStoredKeysChoice = 'protect' | 'forget' | 'cancel';

export interface KeyProtectionSteps {
  /** Where earlier versions stored the keys in plaintext */
  storage: Storage;
  /** The given keys safe storage already holds, unlocked; none when it cannot tell */
  findHeldKeys: (keys: WifKey[]) => Promise<WifKey[]>;
  /** The "saved unprotected" dialog */
  askToProtect: () => Promise<KeyProtectionChoice>;
  /** Asks to confirm forgetting the saved keys: true once confirmed */
  confirmForget: () => Promise<boolean>;
  /**
   * Imports the keys into safe storage behind a password the user enters, and checks it signs with
   * them: true once done, false when the prompt was closed. Rejects when the import failed.
   */
  importKeys: (keys: WifKey[]) => Promise<boolean>;
  /** Puts off asking again */
  snooze: () => void;
}

const SESSION_KEY_TYPES: readonly string[] = ['posting', 'active'] satisfies KeyAuthorityType[];

function isSessionKey(key: { keyType: string; wif: string }): key is WifKey {
  return SESSION_KEY_TYPES.includes(key.keyType);
}

/**
 * Offers to move the WIF keys earlier versions stored in plaintext for `username` into safe
 * storage. Those safe storage already holds are removed without asking. For the others the user is
 * asked; their plaintext entries are removed only once safe storage holds every one of them and was
 * checked to sign with it, so a key that may be the user's only copy is never lost on the way.
 *
 * @throws the error of `importKeys`, leaving the keys stored
 */
export async function protectStoredKeys(username: string, steps: KeyProtectionSteps): Promise<KeyProtectionOutcome> {
  const { storage } = steps;
  const keys = storedWifKeys(storage, username).filter(isSessionKey);
  if (!keys.length) return 'none';

  const held = await steps.findHeldKeys(keys);
  removeStoredWifKeys(storage, username, held.map(({ keyType }) => keyType));
  const unprotected = keys.filter((key) => !held.some(({ keyType }) => keyType === key.keyType));
  if (!unprotected.length) return 'moved';

  const choice = await steps.askToProtect();
  if (choice === 'forget' && (await steps.confirmForget())) {
    forgetStoredWifKeys(storage, username);
    return 'forgotten';
  }
  if (choice !== 'protect' || !(await steps.importKeys(unprotected))) {
    steps.snooze();
    return 'snoozed';
  }
  removeStoredWifKeys(storage, username, unprotected.map(({ keyType }) => keyType));
  return 'moved';
}

/** Whether a WIF key is saved in plaintext for `username` */
export function hasStoredKeys(storage: Storage, username: string): boolean {
  return storedWifKeys(storage, username).length > 0;
}

export interface LeaveStoredKeysSteps {
  storage: Storage;
  /** The dialog asked before the accounts holding saved keys are signed out or removed */
  askBeforeLeaving: (usernames: string[]) => Promise<LeaveStoredKeysChoice>;
  /** Moves the saved keys of `username` into safe storage, as `protectStoredKeys` does, unasked */
  protect: (username: string) => Promise<KeyProtectionOutcome>;
}

/**
 * Settles the plaintext WIF keys of `usernames` before they are signed out or removed, which
 * deletes them: asks only when one of them has a saved key. Forgets them, or moves them into safe
 * storage, as the user chose. Resolves whether to go on; false on "Cancel" or a closed password
 * prompt, leaving the keys saved.
 *
 * @throws the error of `protect`, leaving the keys it did not move saved
 */
export async function settleStoredKeysBeforeLeaving(
  usernames: readonly string[],
  steps: LeaveStoredKeysSteps
): Promise<boolean> {
  const { storage } = steps;
  const owners = usernames.filter((username) => hasStoredKeys(storage, username));
  if (!owners.length) return true;

  const choice = await steps.askBeforeLeaving(owners);
  if (choice === 'cancel') return false;
  if (choice === 'forget') {
    for (const owner of owners) forgetStoredWifKeys(storage, owner);
    return true;
  }
  for (const owner of owners) {
    if ((await steps.protect(owner)) === 'snoozed') return false;
  }
  return true;
}
