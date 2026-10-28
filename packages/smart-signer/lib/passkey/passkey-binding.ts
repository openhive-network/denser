import { getStorageItem, removeStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

/** Which passkey signer holds an account's posting key, and that key: public data only. */
export type PasskeyBinding = { origin: string; publicKey: string };

const storageKey = (username: string) => `passkey-signer-${username}`;

const isBinding = (value: unknown): value is PasskeyBinding =>
  typeof value === 'object' &&
  value !== null &&
  'origin' in value &&
  'publicKey' in value &&
  typeof value.origin === 'string' &&
  typeof value.publicKey === 'string';

/**
 * Remembers that the signer at `origin` signs for `username` with `publicKey`, until the account's
 * passkey session ends (`forgetPasskeyBinding`). Kept without expiry: the session it serves has none.
 */
export function rememberPasskeyBinding(username: string, binding: PasskeyBinding): void {
  setStorageItem(storageKey(username), binding, StorageTTL.PERMANENT);
}

export function passkeyBindingOf(username: string): PasskeyBinding | null {
  const stored = getStorageItem<unknown>(storageKey(username));
  return isBinding(stored) ? stored : null;
}

export function forgetPasskeyBinding(username: string): void {
  removeStorageItem(storageKey(username));
}
