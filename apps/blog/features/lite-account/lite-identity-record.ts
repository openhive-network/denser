import type { LiteIdentity } from '@hiveio/lite-account';

// No runtime import of @hiveio/lite-account: the header reads the stored identity on every page.

/**
 * The lite identity as this browser stores it. An unsecured identity holds its owner key
 * (`ownerWif`); a secured one does not: its owner is a passkey root held by the signer site at
 * `signer`, and this browser holds only a posting key that expires at `deviceExpires`.
 */
export type StoredLiteIdentity = Omit<LiteIdentity, 'ownerWif'> & {
  ownerWif?: string;
  secured: boolean;
  /** The passkey signer origin the owner key's requests go to; set once secured. */
  signer?: string;
  /** When this browser's posting key stops counting on chain (UTC, seconds, no zone). */
  deviceExpires?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * The stored identity read from storage, or null for anything that is not one. An identity stored
 * before passkeys (no `secured`) reads as unsecured with its owner key: a record without the owner
 * key that does not say it is secured cannot sign anything an owner must, and is still read.
 */
export function readStoredLiteIdentity(raw: unknown): StoredLiteIdentity | null {
  if (!isObject(raw)) return null;
  const { name, ownerPublicKey, postingPublicKey, postingWif, createdAt } = raw;
  if (
    typeof name !== 'string' ||
    name === '' ||
    typeof postingWif !== 'string' ||
    typeof postingPublicKey !== 'string'
  )
    return null;
  return {
    name,
    ownerPublicKey: typeof ownerPublicKey === 'string' ? ownerPublicKey : '',
    postingPublicKey,
    postingWif,
    registered: raw.registered === true,
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    ownerWif: optionalString(raw.ownerWif),
    secured: raw.secured === true,
    signer: optionalString(raw.signer),
    deviceExpires: optionalString(raw.deviceExpires)
  };
}

/** A freshly created identity as stored: unsecured, holding both keys. */
export const storedFromCreated = (identity: LiteIdentity): StoredLiteIdentity => ({
  ...identity,
  secured: false
});

/**
 * `identity` once its owner is the passkey root `rootKey` at `signer`: the owner key is dropped,
 * and the posting key now expires at `deviceExpires`.
 */
export function securedIdentity(
  identity: StoredLiteIdentity,
  rootKey: string,
  signer: string,
  deviceExpires: string
): StoredLiteIdentity {
  const { ownerWif: _dropped, ...rest } = identity;
  return { ...rest, ownerPublicKey: rootKey, secured: true, signer, deviceExpires };
}

export type SignedInDevice = {
  name: string;
  rootKey: string;
  signer: string;
  postingWif: string;
  postingPublicKey: string;
  deviceExpires: string;
  nowMs?: number;
};

/** The identity of a browser signed in to a secured lite account: a posting key only, registered. */
export const signedInIdentity = (device: SignedInDevice): StoredLiteIdentity => ({
  name: device.name,
  ownerPublicKey: device.rootKey,
  postingPublicKey: device.postingPublicKey,
  postingWif: device.postingWif,
  registered: true,
  createdAt: new Date(device.nowMs ?? Date.now()).toISOString(),
  secured: true,
  signer: device.signer,
  deviceExpires: device.deviceExpires
});

/**
 * The identity as the package's post builders take it: they read its public keys and posting key,
 * never the owner key, which a secured identity no longer has.
 */
export const signingIdentity = (identity: StoredLiteIdentity): LiteIdentity => ({
  ...identity,
  ownerWif: identity.ownerWif ?? ''
});
