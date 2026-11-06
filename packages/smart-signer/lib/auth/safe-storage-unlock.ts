import type { KeyAuthorityType, OnlineClient } from '@hiveio/hb-auth';
import { classifyUnlockRefusal, WrongSafeStoragePasswordError } from '@smart-signer/lib/wrong-safe-storage-password';

/** What unlocking a key stored in safe storage needs of hb-auth's client */
export type SafeStorageUnlockClient = Pick<
  OnlineClient,
  'authenticate' | 'lock' | 'unlock' | 'getRegisteredUserByUsername'
>;

/** `error` as a WrongSafeStoragePasswordError when it is hb-auth refusing the password of `username`, else undefined */
async function asWrongPassword(
  client: SafeStorageUnlockClient,
  username: string,
  error: unknown
): Promise<WrongSafeStoragePasswordError | undefined> {
  const refusal = await classifyUnlockRefusal(
    error,
    async () => (await client.getRegisteredUserByUsername(username)) !== null
  );
  return refusal === 'wrong-password' ? new WrongSafeStoragePasswordError(error) : undefined;
}

/**
 * Signs in to safe storage with the `keyType` key it holds for `username`, as hb-auth's `authenticate`
 * does. Rejects with WrongSafeStoragePasswordError when hb-auth refused `password`, else with
 * `authenticate`'s error: a key safe storage does not hold for `keyType`, or one the account's
 * authority on chain no longer accepts.
 */
export async function authenticateStoredKey(
  client: SafeStorageUnlockClient,
  username: string,
  password: string,
  keyType: KeyAuthorityType
): Promise<void> {
  try {
    await client.authenticate(username, password, keyType);
  } catch (error) {
    throw (await asWrongPassword(client, username, error)) ?? error;
  }
}

/**
 * Unlocks the wallet of `username`, whom safe storage holds, with `password` before its `keyType` key
 * is written over: hb-auth's `unlock` when its worker has a session of the user, locking it first when
 * unlocked, else signing in with the key held for `keyType`, as `authenticateStoredKey` does. hb-auth's
 * `unlock` skips the password of an unlocked wallet, while `lock` keeps the session; a wrong password
 * thus leaves the session locked, along with any other user's hb-auth had unlocked. Resolves true once unlocked, false when
 * hb-auth refused for another reason than the password (no key held for `keyType`, or one no longer on
 * chain), which leaves the password to the write. Rejects with WrongSafeStoragePasswordError when
 * hb-auth refused `password`.
 */
export async function unlockBeforeKeyWrite(
  client: SafeStorageUnlockClient,
  username: string,
  password: string,
  keyType: KeyAuthorityType
): Promise<boolean> {
  const user = await client.getRegisteredUserByUsername(username);
  try {
    if (user?.authorized) {
      if (user.unlocked) await client.lock();
      await client.unlock(username, password);
    } else await client.authenticate(username, password, keyType);
    return true;
  } catch (error) {
    const wrongPassword = await asWrongPassword(client, username, error);
    if (wrongPassword) throw wrongPassword;
    return false;
  }
}
