import type { LiteIdentity } from '@hiveio/lite-account';

// No runtime import of @hiveio/lite-account: the header reads the stored identity on every page.

/**
 * Where the private keys of the browser's lite identity are: `local`, the WIFs in the stored record
 * (the default); `safe-storage`, hb-auth's password-encrypted wallet, the record holding none.
 */
export type LiteKeyStoreKind = 'local' | 'safe-storage';

/** The roles of the lite account's keys this browser can hold. */
export type LiteKeyRole = 'owner' | 'posting';

/**
 * The lite identity as this browser stores it. An unsecured identity holds its owner key
 * (`ownerWif`); a secured one does not: its owner is a passkey root held by the signer site at
 * `signer`, and this browser holds only a posting key that expires at `deviceExpires`. With
 * `keyStore: 'safe-storage'` the record holds no WIF at all, only the public keys.
 */
export type StoredLiteIdentity = Omit<LiteIdentity, 'ownerWif' | 'postingWif'> & {
  ownerWif?: string;
  postingWif?: string;
  /** Absent reads as `local`. */
  keyStore?: LiteKeyStoreKind;
  secured: boolean;
  /** The passkey signer origin the owner key's requests go to; set once secured. */
  signer?: string;
  /** When this browser's posting key stops counting on chain (UTC, seconds, no zone). */
  deviceExpires?: string;
  /**
   * The Hive account this lite account graduated to, once created. The lite identity stays valid;
   * the account's keys are in the passkey signer, not here.
   */
  graduated?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * The stored identity read from storage, or null for anything that is not one. An identity stored
 * before passkeys (no `secured`) reads as unsecured with its owner key: a record without the owner
 * key that does not say it is secured cannot sign anything an owner must, and is still read. One
 * stored before Safe Storage (no `keyStore`) reads as `local`, without `keyStore`. A `safe-storage`
 * record is read without any WIF it may carry.
 */
export function readStoredLiteIdentity(raw: unknown): StoredLiteIdentity | null {
  if (!isObject(raw)) return null;
  const { name, ownerPublicKey, postingPublicKey, postingWif, createdAt } = raw;
  const safeStorage = raw.keyStore === 'safe-storage';
  if (
    typeof name !== 'string' ||
    name === '' ||
    (!safeStorage && typeof postingWif !== 'string') ||
    typeof postingPublicKey !== 'string'
  )
    return null;
  return {
    name,
    ownerPublicKey: typeof ownerPublicKey === 'string' ? ownerPublicKey : '',
    postingPublicKey,
    ...(safeStorage ? { keyStore: 'safe-storage' as const } : { postingWif: String(postingWif) }),
    registered: raw.registered === true,
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    ownerWif: safeStorage ? undefined : optionalString(raw.ownerWif),
    secured: raw.secured === true,
    signer: optionalString(raw.signer),
    deviceExpires: optionalString(raw.deviceExpires),
    graduated: optionalString(raw.graduated)
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

/** Where `identity`'s private keys are. */
export const liteKeyStoreKind = (identity: StoredLiteIdentity): LiteKeyStoreKind => identity.keyStore ?? 'local';

/**
 * The roles whose private key this browser holds for `identity`: those with a WIF in a `local`
 * record; in Safe Storage the posting key, and the owner key until a passkey root replaced it
 * (only an identity holding both, or a secured one holding its posting key, is moved there).
 */
export function heldKeyRoles(identity: StoredLiteIdentity): LiteKeyRole[] {
  if (liteKeyStoreKind(identity) === 'safe-storage') return identity.secured ? ['posting'] : ['owner', 'posting'];
  return [...(identity.ownerWif ? (['owner'] as const) : []), ...(identity.postingWif ? (['posting'] as const) : [])];
}

/** The public key of `identity`'s `role`. */
export const rolePublicKey = (identity: StoredLiteIdentity, role: LiteKeyRole): string =>
  role === 'owner' ? identity.ownerPublicKey : identity.postingPublicKey;

/**
 * Whether the registered `identity` can make the passkey root its owner: it is not secured yet and
 * this browser holds its owner key, in the record or in Safe Storage.
 */
export const canSecureWithPasskey = (identity: StoredLiteIdentity): boolean =>
  identity.registered && !identity.secured && heldKeyRoles(identity).includes('owner');

/**
 * Whether the registered `identity`'s keys can move from the record into Safe Storage: they are
 * local, and the record holds both keys, or, secured with a passkey, its posting key.
 */
export const canSecureInSafeStorage = (identity: StoredLiteIdentity): boolean =>
  identity.registered &&
  liteKeyStoreKind(identity) === 'local' &&
  !!identity.postingWif &&
  (identity.secured || !!identity.ownerWif);

/** `identity` once its keys are in Safe Storage: no WIF, the public keys kept. */
export function inSafeStorage(identity: StoredLiteIdentity): StoredLiteIdentity {
  const { ownerWif: _owner, postingWif: _posting, ...rest } = identity;
  return { ...rest, keyStore: 'safe-storage' };
}

/** `identity` once it graduated to the Hive account `account`. */
export const graduatedIdentity = (identity: StoredLiteIdentity, account: string): StoredLiteIdentity => ({
  ...identity,
  graduated: account
});

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
