import { createPasskeyUnlock, recoverPasskeyPassword } from '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { readPasskeyUnlock, storePasskeyUnlock } from '@smart-signer/lib/passkey-unlock/passkey-unlock-store';

/** What unlocking with the password a passkey gives needs of an hb-auth client, online or offline */
export type PasskeyUnlockClient<KeyType extends string, Status> = {
  authenticate(username: string, password: string, keyType: KeyType): Promise<Status>;
};

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
 * Authenticates `username`'s `keyType` key on `client` with the password its passkey gives: the
 * passkey registered on this device, asked with `userVerification`. Rejects with
 * PasskeyUnlockError when the passkey gives none, else as `client.authenticate` does.
 */
export async function unlockWithPasskey<KeyType extends string, Status>(
  client: PasskeyUnlockClient<KeyType, Status>,
  username: string,
  keyType: KeyType,
  userVerification: UserVerificationRequirement
): Promise<Status> {
  const record = await readPasskeyUnlock(username);
  if (!record) throw new PasskeyUnlockError(`No passkey unlock registered for ${username}`, 'not-registered');
  const password = await recoverPasskeyPassword(navigator.credentials, record, userVerification);
  return client.authenticate(username, password, keyType);
}
