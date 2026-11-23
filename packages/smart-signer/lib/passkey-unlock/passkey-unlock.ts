import {
  createPasskeyUnlock,
  recoverPasskeyPassword,
  type PasskeyCredentials
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import {
  readPasskeyUnlock,
  removePasskeyUnlock,
  storePasskeyUnlock
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';
import { classifyUnlockRefusal } from '@smart-signer/lib/wrong-safe-storage-password';

/** What unlocking with the password a passkey gives needs of an hb-auth client, online or offline */
export type PasskeyUnlockClient<KeyType extends string, Status> = {
  authenticate(username: string, password: string, keyType: KeyType): Promise<Status>;
  getRegisteredUserByUsername(username: string): Promise<unknown>;
};

/** The passkey record store `unlockWithPasskey` reads, and clears of a record that no longer unlocks */
export type PasskeyUnlockStore = {
  read: typeof readPasskeyUnlock;
  remove: typeof removePasskeyUnlock;
};

const BROWSER_STORE: PasskeyUnlockStore = { read: readPasskeyUnlock, remove: removePasskeyUnlock };

/**
 * Lets a passkey of this device (fingerprint, face, device PIN) unlock `username`'s safe storage
 * in place of `password`, which must be the one just accepted. hb-auth's `hasPasskey` sees it.
 * Rejects with PasskeyUnlockError.
 */
export async function registerPasskeyUnlock(username: string, password: string): Promise<void> {
  const record = await createPasskeyUnlock(navigator.credentials, username, password, location.hostname);
  await storePasskeyUnlock(record);
}

/**
 * The PasskeyUnlockError, as stale, of `client` refusing the password `username`'s passkey gave;
 * undefined when it refused for another reason (a key it does not hold, or one off chain)
 */
async function asStalePassword(
  client: Pick<PasskeyUnlockClient<string, unknown>, 'getRegisteredUserByUsername'>,
  username: string,
  error: unknown
): Promise<PasskeyUnlockError | undefined> {
  const refusal = await classifyUnlockRefusal(
    error,
    async () => (await client.getRegisteredUserByUsername(username)) !== null
  );
  if (refusal !== 'wrong-password') return undefined;
  return new PasskeyUnlockError('Passkey unlock: safe storage refuses the stored password', 'stale', { cause: error });
}

/**
 * Authenticates `username`'s `keyType` key on `client` with the password its passkey gives: the
 * passkey registered on this device, asked with `userVerification`. A record that no longer
 * unlocks, its password not decrypting or refused by `client`, is removed, so the passkey can be
 * enabled again; one the user cancelled stays. Rejects with PasskeyUnlockError when the passkey
 * gives no password or a refused one, else as `client.authenticate` does.
 */
export async function unlockWithPasskey<KeyType extends string, Status>(
  client: PasskeyUnlockClient<KeyType, Status>,
  username: string,
  keyType: KeyType,
  userVerification: UserVerificationRequirement,
  credentials: PasskeyCredentials = navigator.credentials,
  store: PasskeyUnlockStore = BROWSER_STORE
): Promise<Status> {
  const record = await store.read(username);
  if (!record) throw new PasskeyUnlockError(`No passkey unlock registered for ${username}`, 'not-registered');
  try {
    const password = await recoverPasskeyPassword(credentials, record, userVerification);
    try {
      return await client.authenticate(username, password, keyType);
    } catch (error) {
      throw (await asStalePassword(client, username, error)) ?? error;
    }
  } catch (error) {
    if (error instanceof PasskeyUnlockError && error.reason === 'stale') await store.remove(username);
    throw error;
  }
}

/**
 * Unlocks `username`'s `keyType` key on `client` with its passkey, as `unlockWithPasskey` does, and
 * resolves with what `client.authenticate` did and with the password the passkey gave, for what signs
 * next without a prompt of its own
 */
export async function unlockWithPasskeyGivingPassword<KeyType extends string, Status>(
  client: PasskeyUnlockClient<KeyType, Status>,
  username: string,
  keyType: KeyType,
  userVerification: UserVerificationRequirement
): Promise<{ status: Status; password: string }> {
  let password = '';
  const status = await unlockWithPasskey(
    {
      authenticate: (name: string, given: string, type: KeyType) => {
        password = given;
        return client.authenticate(name, given, type);
      },
      getRegisteredUserByUsername: (name: string) => client.getRegisteredUserByUsername(name)
    },
    username,
    keyType,
    userVerification
  );
  return { status, password };
}
