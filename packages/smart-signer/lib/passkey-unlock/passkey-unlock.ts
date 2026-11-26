import {
  answersRecordSalt,
  createPasskeyUnlock,
  discoverPasskey,
  isOnDeviceSalt,
  isPasskeyOf,
  isRecordPasskey,
  passkeyUserId,
  pickedPasskeyPassword,
  recoverPasskeyPassword,
  reusePasskeyUnlock,
  wrapPassword,
  type FoundPasskey,
  type PasskeyCredentials,
  type PickedPasskey,
  type PasskeyUnlockRecord
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { signalAcceptedPasskey } from '@smart-signer/lib/passkey-unlock/passkey-signals';
import {
  readDevicePrfSalt,
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
 * and writes the record of a passkey that took the registered one's place to, with the device salt
 * every record it writes is encrypted under
 */
export type PasskeyUnlockStore = {
  read: typeof readPasskeyUnlock;
  remove: typeof removePasskeyUnlock;
  write: typeof storePasskeyUnlock;
  deviceSalt: typeof readDevicePrfSalt;
};

const BROWSER_STORE: PasskeyUnlockStore = {
  read: readPasskeyUnlock,
  remove: removePasskeyUnlock,
  write: storePasskeyUnlock,
  deviceSalt: readDevicePrfSalt
};

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
  const previous = await store.read(username);
  await store.write(
    await reusePasskeyUnlock(credentials, username, password, location.hostname, await store.deviceSalt(), previous)
  );
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
  const record = await createPasskeyUnlock(credentials, username, password, location.hostname, await store.deviceSalt());
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

/** Whether `failure`, a passkey unlock that failed, found another passkey of `username` the password it asks for next moves the record to */
export const isPasskeyRelink = (failure: unknown, username: string): failure is PasskeyReplacedError =>
  failure instanceof PasskeyReplacedError && failure.username === username;

/**
 * Where `failure`, a passkey unlock of `username` that failed, found another passkey of the
 * account, keeps `password`, just accepted, under it. Never rejects: without it the next sign-in
 * asks for the password, and enabling the unlock finds the passkey again.
 */
export async function adoptReplacedPasskey(failure: unknown, username: string, password: string): Promise<void> {
  if (!isPasskeyRelink(failure, username)) return;
  try {
    await failure.adopt(password);
  } catch (error) {
    logger.error(error, 'Passkey unlock of %s not moved to its new passkey', username);
  }
}

/**
 * The record of the account `picked` is a passkey of: `record`'s own, else the record on this
 * device of one of `accounts`; undefined for an account without one here
 */
async function ownerRecord(
  store: PasskeyUnlockStore,
  record: PasskeyUnlockRecord,
  accounts: readonly string[],
  picked: PickedPasskey
): Promise<PasskeyUnlockRecord | undefined> {
  if (await isPasskeyOf(picked, record.username)) return record;
  for (const username of accounts) {
    if (username === record.username || !(await isPasskeyOf(picked, username))) continue;
    return (await store.read(username)) ?? undefined;
  }
  return undefined;
}

/** A record's password, and the passkey that gave it, under whose device salt the record is to be kept */
type FoundPassword = { record: PasskeyUnlockRecord; password: string; picked: PickedPasskey };

type Unlocking = {
  credentials: PasskeyCredentials;
  store: PasskeyUnlockStore;
  accounts: readonly string[];
  userVerification: UserVerificationRequirement;
  signal?: AbortSignal;
};

/**
 * The password a passkey the user picks gives, asked of the account's passkeys without naming
 * `record`'s credential, and the record it is the password of: `record`'s, or that of one of
 * `accounts` linked on this device whose passkey the user picked instead. One request answers for
 * a record on the device salt and for `record`'s own salt; another account's record on a salt of
 * its own takes a second one naming its credential. Rejects with
 * PasskeyUnlockError: cancelled, keeping every record (a cancel says nothing of whether the passkey
 * is still there); wrong-account for a passkey of an account not linked here; PasskeyReplacedError
 * where the account's passkey is not its record's.
 */
async function passwordOfPickedPasskey(
  record: PasskeyUnlockRecord,
  { credentials, store, accounts, userVerification, signal }: Unlocking
): Promise<FoundPassword> {
  const { username, rpId, prfSalt } = record;
  const deviceSalt = await store.deviceSalt();
  const picked = await discoverPasskey(credentials, { rpId, userVerification, deviceSalt, knownSalt: prfSalt, signal });
  const owner = await ownerRecord(store, record, accounts, picked);
  if (!owner) throw new PasskeyUnlockError(`Passkey unlock: the passkey picked is not ${username}'s`, 'wrong-account');
  if (!isRecordPasskey(owner, picked)) throw replaced(store, owner, picked.passkey);
  const password = await chargedTo(
    owner.username,
    answersRecordSalt(owner, picked)
      ? pickedPasskeyPassword(owner, picked)
      : recoverPasskeyPassword(credentials, owner, userVerification, signal)
  );
  return { record: owner, password, picked };
}

/** What `attempt` gives; its PasskeyUnlockError as one of `username`, whose passkey was picked or named */
async function chargedTo<T>(username: string, attempt: Promise<T>): Promise<T> {
  try {
    return await attempt;
  } catch (error) {
    if (!(error instanceof PasskeyUnlockError) || error.account !== undefined) throw error;
    throw new PasskeyUnlockError(error.message, error.reason, { cause: error.cause, account: username });
  }
}

/**
 * Moves `found.record`, still on a salt of its own, to the device salt its passkey just answered
 * for, so picking it needs one request from then on. The record is replaced only by a copy whose
 * password decrypts, in one write; a failure keeps it as it was. Never rejects.
 */
async function moveToDeviceSalt(store: PasskeyUnlockStore, { record, password, picked }: FoundPassword): Promise<void> {
  if (isOnDeviceSalt(record, picked)) return;
  const { username, rpId, transports } = record;
  try {
    await store.write(
      await wrapPassword(username, password, rpId, { ...picked.passkey, transports: transports ?? picked.passkey.transports })
    );
  } catch (error) {
    logger.error(error, 'Passkey unlock of %s kept on its own salt', username);
  }
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

export type PasskeyUnlockOptions = {
  /**
   * Accounts the user may pick the passkey of instead, at a sign-in that could be any of them:
   * where the passkey picked is one of theirs linked on this device, that account is unlocked
   */
  accounts?: readonly string[];
  /** Aborts the browser's prompt, which then rejects as cancelled */
  signal?: AbortSignal;
  credentials?: PasskeyCredentials;
  store?: PasskeyUnlockStore;
};

/**
 * Authenticates `username`'s `keyType` key on `client` with the password a passkey the user picks
 * gives, asked with `userVerification` in one request naming no credential, and resolves with the
 * account unlocked (`username`, or one of `options.accounts` whose passkey the user picked), what
 * `client.authenticate` did and the password. A record is removed only where it no longer unlocks:
 * its password does not decrypt or `client` refuses it. Rejects with PasskeyUnlockError: cancelled
 * where no passkey was picked, keeping the record; wrong-account; PasskeyReplacedError where another
 * passkey of the account answered; otherwise as `client.authenticate` does.
 */
export async function unlockWithPasskeyGivingPassword<KeyType extends string, Status>(
  client: PasskeyUnlockClient<KeyType, Status>,
  username: string,
  keyType: KeyType,
  userVerification: UserVerificationRequirement,
  { accounts = [], signal, credentials = navigator.credentials, store = BROWSER_STORE }: PasskeyUnlockOptions = {}
): Promise<{ username: string; status: Status; password: string }> {
  const record = await store.read(username);
  if (!record) throw new PasskeyUnlockError(`No passkey unlock registered for ${username}`, 'not-registered');
  let unlocked = username;
  try {
    const found = await passwordOfPickedPasskey(record, { credentials, store, accounts, userVerification, signal });
    unlocked = found.record.username;
    try {
      const status = await client.authenticate(unlocked, found.password, keyType);
      await moveToDeviceSalt(store, found);
      return { username: unlocked, status, password: found.password };
    } catch (error) {
      throw (await asStalePassword(client, unlocked, error)) ?? error;
    }
  } catch (error) {
    if (error instanceof PasskeyUnlockError && error.reason === 'stale') await store.remove(error.account ?? unlocked);
    throw error;
  }
}

/**
 * Authenticates `username`'s `keyType` key on `client` with the password its passkey gives, as
 * `unlockWithPasskeyGivingPassword` does for `username` alone
 */
export async function unlockWithPasskey<KeyType extends string, Status>(
  client: PasskeyUnlockClient<KeyType, Status>,
  username: string,
  keyType: KeyType,
  userVerification: UserVerificationRequirement,
  credentials: PasskeyCredentials = navigator.credentials,
  store: PasskeyUnlockStore = BROWSER_STORE
): Promise<Status> {
  return (await unlockWithPasskeyGivingPassword(client, username, keyType, userVerification, { credentials, store })).status;
}
