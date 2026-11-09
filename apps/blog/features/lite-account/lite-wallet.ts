import { LITE_DID_PREFIX } from './lite-did.ts';
import { inSafeStorage, type LiteKeyRole, type StoredLiteIdentity } from './lite-identity-record.ts';

// The lite identity's entry in Safe Storage (hb-auth's Beekeeper wallet). No runtime import of
// hb-auth: the client comes in through `LiteWallet`, the browser's in `lite-wallet-browser`.

/** How many characters of the posting public key (after its prefix) name the entry. */
const KEY_TAG_LENGTH = 8;
const PUBLIC_KEY_PREFIX_LENGTH = 3;
/** The order the keys are registered in: the first registration creates the entry's wallet. */
const ROLES: readonly LiteKeyRole[] = ['owner', 'posting'];

type WalletStatus = { ok: boolean };
type WalletEntry = { unlocked: boolean; registeredKeyTypes: readonly string[] };

/** What the lite flows ask of hb-auth's offline client of the lite entries (common-hiveio-packages' `LiteWalletClient`). */
export type LiteSafeStorageClient = {
  register(username: string, password: string, wifKey: string, keyType: LiteKeyRole): Promise<WalletStatus>;
  authenticate(username: string, password: string, keyType: LiteKeyRole): Promise<WalletStatus>;
  sign(username: string, digest: string, keyType: LiteKeyRole): Promise<string>;
  getRegisteredUserByUsername(username: string): Promise<WalletEntry | null>;
  invalidateExistingKey(username: string, keyType: LiteKeyRole): Promise<void>;
  hasPasskey(username: string): Promise<boolean>;
  removePasskey(username: string): Promise<void>;
  logout(username: string): Promise<void>;
};

/** Safe Storage as the lite key store uses it: the client, and the unlock step a locked entry needs. */
export type LiteWallet = {
  client: () => Promise<LiteSafeStorageClient>;
  /** Unlocks `identity`'s entry for its `keyType` key; rejects when the guest cancels or it fails. */
  unlock: (identity: StoredLiteIdentity, keyType: LiteKeyRole) => Promise<void>;
};

/**
 * The hb-auth username of `identity`'s entry: its DID, which no Hive account name can be (`:`),
 * tagged with its posting key. Beekeeper cannot delete one wallet, so a forgotten entry's wallet
 * stays, under the password it had; a later identity of the same name (signed in again on this
 * device) has another posting key, and so a wallet of its own.
 */
export const liteWalletUsername = (identity: Pick<StoredLiteIdentity, 'name' | 'postingPublicKey'>): string =>
  `${LITE_DID_PREFIX}${identity.name}:${identity.postingPublicKey.slice(
    PUBLIC_KEY_PREFIX_LENGTH,
    PUBLIC_KEY_PREFIX_LENGTH + KEY_TAG_LENGTH
  )}`;

const isRole = (keyType: string): keyType is LiteKeyRole => (ROLES as readonly string[]).includes(keyType);

/** The roles `username`'s entry holds a key of; none without an entry. */
async function registeredRoles(client: LiteSafeStorageClient, username: string): Promise<LiteKeyRole[]> {
  const entry = await client.getRegisteredUserByUsername(username);
  return (entry?.registeredKeyTypes ?? []).filter(isRole);
}

/**
 * Registers every WIF the `local` record `identity` holds (owner, then posting) under one entry,
 * encrypted with `password`, and resolves with the record to store: `keyStore: 'safe-storage'`,
 * without the WIFs. A key an earlier, unfinished attempt left is replaced. Rejects with hb-auth's
 * error, the record unchanged.
 */
export async function moveKeysToSafeStorage(
  identity: StoredLiteIdentity,
  password: string,
  client: LiteSafeStorageClient
): Promise<StoredLiteIdentity> {
  const username = liteWalletUsername(identity);
  const wifs: Partial<Record<LiteKeyRole, string>> = { owner: identity.ownerWif, posting: identity.postingWif };
  const left = await registeredRoles(client, username);
  for (const role of ROLES) {
    const wif = wifs[role];
    if (!wif) continue;
    if (left.includes(role)) await client.invalidateExistingKey(username, role);
    await client.register(username, password, wif, role);
  }
  return inSafeStorage(identity);
}

/** Takes the `role` key out of `identity`'s entry (an owner key a passkey root replaced). */
export async function dropWalletKey(identity: StoredLiteIdentity, role: LiteKeyRole, client: LiteSafeStorageClient): Promise<void> {
  const username = liteWalletUsername(identity);
  if ((await registeredRoles(client, username)).includes(role)) await client.invalidateExistingKey(username, role);
}

/**
 * Removes `identity`'s entry: ends its session, takes out each key and removes its passkey. The
 * encrypted wallet file stays (Beekeeper deletes no single wallet), holding no key hb-auth signs with.
 */
export async function removeWalletEntry(identity: StoredLiteIdentity, client: LiteSafeStorageClient): Promise<void> {
  const username = liteWalletUsername(identity);
  if (!(await client.getRegisteredUserByUsername(username))) return;
  await client.logout(username);
  for (const role of await registeredRoles(client, username)) await client.invalidateExistingKey(username, role);
  if (await client.hasPasskey(username)) await client.removePasskey(username);
}

/** Whether `identity`'s entry is unlocked: its keys sign without the unlock step. */
export async function isWalletUnlocked(identity: StoredLiteIdentity, client: LiteSafeStorageClient): Promise<boolean> {
  return (await client.getRegisteredUserByUsername(liteWalletUsername(identity)))?.unlocked ?? false;
}
