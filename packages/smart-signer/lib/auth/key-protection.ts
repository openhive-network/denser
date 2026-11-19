import type { KeyAuthorityType } from '@hiveio/hb-auth';
import { removeStoredWifKeys, storedWifKeys } from '@smart-signer/lib/signer/credential-storage';
import type { WifKey } from '@smart-signer/lib/signer/safe-storage-import';

/**
 * How offering to protect the plaintext WIF keys of an account ended: `none` stored; `moved` into
 * safe storage, every one of them, and removed; `snoozed` when the user chose "Not now" or closed
 * the password prompt, leaving them stored.
 */
export type KeyProtectionOutcome = 'none' | 'moved' | 'snoozed';

export interface KeyProtectionSteps {
  /** Where earlier versions stored the keys in plaintext */
  storage: Storage;
  /** The given keys safe storage already holds, unlocked; none when it cannot tell */
  findHeldKeys: (keys: WifKey[]) => Promise<WifKey[]>;
  /** The "saved unprotected" dialog: true for "Set a password", false for "Not now" */
  askToProtect: () => Promise<boolean>;
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

  if (!(await steps.askToProtect()) || !(await steps.importKeys(unprotected))) {
    steps.snooze();
    return 'snoozed';
  }
  removeStoredWifKeys(storage, username, unprotected.map(({ keyType }) => keyType));
  return 'moved';
}
