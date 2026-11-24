import {
  createPasskeyUnlock,
  passkeyUserId,
  recoverPasskeyPassword,
  rediscoverPasskey,
  reusePasskeyUnlock,
  wrapPassword,
  type FoundPasskey,
  type PasskeyCredentials,
  type PasskeyUnlockRecord
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { signalAcceptedPasskey } from '@smart-signer/lib/passkey-unlock/passkey-signals';
import {
  readPasskeyUnlock,
  removePasskeyUnlock,
  storePasskeyUnlock
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';
import { classifyUnlockRefusal } from '@smart-signer/lib/wrong-safe-storage-password';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/** What unlocking with the password a passkey gives needs of an hb-auth client, online or offline */
export type PasskeyUnlockClient<KeyType extends string, Status> = {
  authenticate(username: string, password: string, keyType: KeyType): Promise<Status>;
  getRegisteredUserByUsername(username: string): Promise<unknown>;
};

/**
 * The passkey record store `unlockWithPasskey` reads, clears of a record that no longer unlocks,
 * and writes the record of a passkey that took the registered one's place to
 */
export type PasskeyUnlockStore = {
  read: typeof readPasskeyUnlock;
  remove: typeof removePasskeyUnlock;
  write: typeof storePasskeyUnlock;
};

const BROWSER_STORE: PasskeyUnlockStore = { read: readPasskeyUnlock, remove: removePasskeyUnlock, write: storePasskeyUnlock };

/**
 * Lets a passkey `username` already has, synced from another device, unlock `username`'s safe
 * storage on this device in place of `password`, which must be the one just accepted, creating no
 * passkey: creating one would replace the passkey the other devices unlock with. Rejects with
 * PasskeyUnlockError, as cancelled where the user picked none (or the account has none).
 */
export async function reusePasskeyUnlockOf(
  username: string,
  password: string,
  credentials: PasskeyCredentials = navigator.credentials,
  store: PasskeyUnlockStore = BROWSER_STORE
): Promise<void> {
  await store.write(await reusePasskeyUnlock(credentials, username, password, location.hostname));
}

/**
 * Lets a new passkey of this device (fingerprint, face, device PIN) unlock `username`'s safe
 * storage in place of `password`, which must be the one just accepted. hb-auth's `hasPasskey` sees
 * it. The provider replaces the passkey it held for the account, on every device it syncs to, so
 * this is for an account that has none (`reusePasskeyUnlockOf` first). Rejects with PasskeyUnlockError.
 */
export async function registerPasskeyUnlock(
  username: string,
  password: string,
  credentials: PasskeyCredentials = navigator.credentials,
  store: PasskeyUnlockStore = BROWSER_STORE
): Promise<void> {
  const record = await createPasskeyUnlock(credentials, username, password, location.hostname);
  await store.write(record);
  // Only here does the app know the account's passkeys: the provider has just replaced its own of the handle with this one
  await signalAcceptedPasskey(record.rpId, await passkeyUserId(username), record.credentialId);
}

/**
 * The PasskeyUnlockError of a record whose passkey another passkey of the account replaced (or a
 * synced one answered for): `adopt` encrypts the password, once the user enters it, under that
 * passkey in place of the record, so the next unlock needs the passkey alone
 */
export class PasskeyReplacedError extends PasskeyUnlockError {
  readonly username: string;
  readonly adopt: (password: string) => Promise<void>;

  constructor(username: string, adopt: (password: string) => Promise<void>) {
    super(`Passkey unlock: another passkey of ${username} replaced the registered one`, 'replaced');
    this.username = username;
    this.adopt = adopt;
  }
}

/**
 * Where `failure`, a passkey unlock of `username` that failed, found another passkey of the
 * account, keeps `password`, just accepted, under it. Never rejects: without it the next sign-in
 * asks for the password, and enabling the unlock finds the passkey again.
 */
export async function adoptReplacedPasskey(failure: unknown, username: string, password: string): Promise<void> {
  if (!(failure instanceof PasskeyReplacedError) || failure.username !== username) return;
  try {
    await failure.adopt(password);
  } catch (error) {
    logger.error(error, 'Passkey unlock of %s not moved to its new passkey', username);
  }
}

/** Whether `error` says `username`'s record was dropped, the account having no passkey the browser reaches */
export const isPasskeyGone = (error: unknown) => error instanceof PasskeyUnlockError && error.reason === 'gone';

const isCancelled = (error: unknown) => error instanceof PasskeyUnlockError && error.reason === 'cancelled';

/**
 * The password of `record`, asked of its passkey; where the browser answers as for a cancel (as it
 * does a credential it no longer has), asked once more of whichever passkey of the account the user
 * picks. Rejects with PasskeyReplacedError for a passkey other than the record's; as gone, having
 * removed the record, where none answers either time.
 */
async function recoverOrRediscover(
  credentials: PasskeyCredentials,
  store: PasskeyUnlockStore,
  record: PasskeyUnlockRecord,
  userVerification: UserVerificationRequirement
): Promise<string> {
  try {
    return await recoverPasskeyPassword(credentials, record, userVerification);
  } catch (error) {
    if (!isCancelled(error)) throw error;
  }
  let found: Awaited<ReturnType<typeof rediscoverPasskey>>;
  try {
    found = await rediscoverPasskey(credentials, record, userVerification);
  } catch (error) {
    if (!isCancelled(error)) throw error;
    // Only the record goes: a cancel looks the same, so its passkey may well be live and synced
    await store.remove(record.username);
    throw new PasskeyUnlockError(`Passkey unlock: no passkey of ${record.username} answers`, 'gone', { cause: error });
  }
  if ('password' in found) return found.password;
  throw replaced(store, record, found.replacement);
}

function replaced(store: PasskeyUnlockStore, record: PasskeyUnlockRecord, passkey: FoundPasskey): PasskeyReplacedError {
  const { username, rpId } = record;
  return new PasskeyReplacedError(username, async (password) => {
    await store.write(await wrapPassword(username, password, rpId, passkey));
  });
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
 * passkey registered on this device, asked with `userVerification`, else once any passkey of the
 * account (`recoverOrRediscover`). A record that no longer unlocks is removed, so the unlock can be
 * enabled again: its password does not decrypt, `client` refuses it, or no passkey answers either
 * prompt. Rejects with PasskeyUnlockError when the passkey gives no password or a refused one
 * (PasskeyReplacedError where another passkey of the account answered), else as
 * `client.authenticate` does.
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
    const password = await recoverOrRediscover(credentials, store, record, userVerification);
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
