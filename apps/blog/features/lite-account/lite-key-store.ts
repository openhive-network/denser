import { l2Digest, signDigest, type L2SignedFields, type L2Transaction } from '@hiveio/lite-account';
import {
  heldKeyRoles,
  liteKeyStoreKind,
  rolePublicKey,
  type LiteKeyRole,
  type LiteKeyStoreKind,
  type StoredLiteIdentity
} from './lite-identity-record.ts';
import { liteWalletUsername, type LiteWallet } from './lite-wallet.ts';

// The one way the lite flows sign: per identity, the keys this browser holds and a signature per
// key over `l2Digest(fields, chainId)`. Where the private keys are is the backend's business.

/** Signs L2 transactions with the keys of one lite identity held in this browser. */
export interface LiteKeyStore {
  readonly kind: LiteKeyStoreKind;
  /** The public keys of the roles whose private key this store holds. */
  readonly publicKeys: Partial<Record<LiteKeyRole, string>>;
  /** `fields` signed with the `role` key. Rejects with `LiteKeyStoreError('key_not_held')` for a role it holds no key of. */
  sign(role: LiteKeyRole, fields: L2SignedFields): Promise<L2Transaction>;
}

/** A role this browser holds no key of (`key_not_held`), or a Safe Storage store without its wallet (`no_wallet`). */
export class LiteKeyStoreError extends Error {
  readonly code: 'key_not_held' | 'no_wallet';

  constructor(code: LiteKeyStoreError['code'], message: string) {
    super(message);
    this.name = 'LiteKeyStoreError';
    this.code = code;
  }
}

function heldPublicKeys(identity: StoredLiteIdentity): Partial<Record<LiteKeyRole, string>> {
  return Object.fromEntries(heldKeyRoles(identity).map((role) => [role, rolePublicKey(identity, role)]));
}

const keyNotHeld = (identity: StoredLiteIdentity, role: LiteKeyRole) =>
  new LiteKeyStoreError('key_not_held', `this browser holds no ${role} key of ${identity.name}`);

/** The WIFs of a `local` record, signed with `signDigest`. */
function localKeyStore(identity: StoredLiteIdentity, chainId: string): LiteKeyStore {
  const wifs: Partial<Record<LiteKeyRole, string>> = { owner: identity.ownerWif, posting: identity.postingWif };
  return {
    kind: 'local',
    publicKeys: heldPublicKeys(identity),
    async sign(role, fields) {
      const wif = wifs[role];
      if (!wif) throw keyNotHeld(identity, role);
      return { ...fields, signatures: [signDigest(l2Digest(fields, chainId), wif)] };
    }
  };
}

/**
 * hb-auth's wallet: the entry `liteWalletUsername(identity)` signs with its `owner` or `posting`
 * key (the hb-auth key types of the same names). A locked entry is unlocked first (the wallet's
 * unlock step); the signature is asked only once it is unlocked.
 */
function safeStorageKeyStore(identity: StoredLiteIdentity, chainId: string, wallet: LiteWallet): LiteKeyStore {
  const publicKeys = heldPublicKeys(identity);
  const username = liteWalletUsername(identity);
  return {
    kind: 'safe-storage',
    publicKeys,
    async sign(role, fields) {
      if (!publicKeys[role]) throw keyNotHeld(identity, role);
      const digest = l2Digest(fields, chainId);
      const client = await wallet.client();
      const entry = await client.getRegisteredUserByUsername(username);
      if (!entry?.unlocked) await wallet.unlock(identity, role);
      return { ...fields, signatures: [await client.sign(username, digest, role)] };
    }
  };
}

/**
 * The key store of `identity` for transactions of the chain `chainId`: its `local` WIFs, or its
 * Safe Storage entry through `wallet` (without which a `safe-storage` identity cannot sign).
 */
export function liteKeyStore(identity: StoredLiteIdentity, chainId: string, wallet?: LiteWallet): LiteKeyStore {
  if (liteKeyStoreKind(identity) === 'local') return localKeyStore(identity, chainId);
  if (!wallet) throw new LiteKeyStoreError('no_wallet', `the keys of ${identity.name} are in Safe Storage`);
  return safeStorageKeyStore(identity, chainId, wallet);
}
