import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLiteIdentity,
  l2Digest,
  l2Expiration,
  l2SignedFields,
  MAINNET_CHAIN_ID,
  signDigest,
  verifySignature,
  type L2Transaction
} from '@hiveio/lite-account';

const { inSafeStorage, securedIdentity, storedFromCreated } = await import('./lite-identity-record.ts');
const { liteKeyStore, LiteKeyStoreError } = await import('./lite-key-store.ts');
const { dropWalletKey, isWalletUnlocked, liteWalletUsername, moveKeysToSafeStorage, removeWalletEntry } = await import(
  './lite-wallet.ts'
);
const { signedLiteDelete, signedLiteEdit, signedLiteReply } = await import('./lite-signed-requests.ts');

type Role = 'owner' | 'posting';

/**
 * hb-auth's offline client as the lite entries use it: one wallet per username, encrypted with the
 * password of its first registration, holding a key per alias (`<username>@<keyType>`); register,
 * authenticate and a wallet already unlocked unlock it; sign needs it unlocked and signs with the
 * real key, as Beekeeper does. `calls` lists every call.
 */
class FakeWalletClient {
  readonly calls: string[] = [];
  readonly wallets = new Map<string, { password: string; keys: Map<string, string>; unlocked: boolean }>();
  readonly passkeys = new Set<string>();

  async register(username: string, password: string, wif: string, keyType: Role) {
    this.calls.push(`register ${username} ${keyType}`);
    const wallet = this.wallets.get(username) ?? { password, keys: new Map(), unlocked: true };
    if (!wallet.unlocked && wallet.password !== password) throw new Error('Invalid credentials');
    if (wallet.keys.has(keyType)) throw new Error(`This user is already registered with '${keyType}' authority`);
    wallet.keys.set(keyType, wif);
    wallet.unlocked = true;
    this.wallets.set(username, wallet);
    return { ok: true };
  }

  async authenticate(username: string, password: string, keyType: Role) {
    this.calls.push(`authenticate ${username} ${keyType}`);
    const wallet = this.wallets.get(username);
    if (!wallet || wallet.password !== password) throw new Error('Invalid credentials');
    wallet.unlocked = true;
    return { ok: true };
  }

  async sign(username: string, digest: string, keyType: Role) {
    this.calls.push(`sign ${username} ${keyType}`);
    const wallet = this.wallets.get(username);
    const wif = wallet?.keys.get(keyType);
    if (!wallet?.unlocked || !wif) throw new Error('Not authorized');
    return signDigest(digest, wif);
  }

  async getRegisteredUserByUsername(username: string) {
    const wallet = this.wallets.get(username);
    return wallet ? { unlocked: wallet.unlocked, registeredKeyTypes: [...wallet.keys.keys()] } : null;
  }

  async invalidateExistingKey(username: string, keyType: Role) {
    this.calls.push(`invalidate ${username} ${keyType}`);
    const keys = this.wallets.get(username)?.keys;
    const wif = keys?.get(keyType);
    if (!keys || !wif) return;
    keys.delete(keyType);
    keys.set(`${keyType}-1767225600000`, wif);
  }

  async hasPasskey(username: string) {
    return this.passkeys.has(username);
  }

  async removePasskey(username: string) {
    this.calls.push(`removePasskey ${username}`);
    this.passkeys.delete(username);
  }

  async logout(username: string) {
    this.calls.push(`logout ${username}`);
    const wallet = this.wallets.get(username);
    if (wallet) wallet.unlocked = false;
  }
}

const CHAIN_ID = MAINNET_CHAIN_ID;
const ROOT_KEY = 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4';
const PASSWORD = 'correct horse';
const created = createLiteIdentity('quiet-heron-271');
const local = { ...storedFromCreated(created), registered: true };
const fields = l2SignedFields('lite_social_test', [{ method: 'follow', args: { actor: 'did:lite:quiet-heron-271', target: 'did:hive:gtg' } }], l2Expiration());

/** The fake client holding `local`'s keys, and a wallet that unlocks with `PASSWORD` (counting the unlocks). */
async function inWallet() {
  const client = new FakeWalletClient();
  const moved = await moveKeysToSafeStorage(local, PASSWORD, client);
  const unlocks: Role[] = [];
  const wallet = {
    client: async () => client,
    unlock: async (identity: typeof moved, keyType: Role) => {
      unlocks.push(keyType);
      await client.authenticate(liteWalletUsername(identity), PASSWORD, keyType);
    }
  };
  return { client, moved, wallet, unlocks };
}

/** `tx` carries one signature, over its L2 digest on `CHAIN_ID`, by `publicKey`. */
function assertSignedBy(tx: L2Transaction, publicKey: string) {
  const { signatures, ...signed } = tx;
  assert.equal(signatures.length, 1);
  assert.ok(verifySignature(l2Digest(signed, CHAIN_ID), signatures[0], publicKey));
}

describe('the lite key store', () => {
  it('signs with the WIFs of a local record, one signature per key, over the chain-bound digest', async () => {
    const keys = liteKeyStore(local, CHAIN_ID);
    assert.equal(keys.kind, 'local');
    assert.deepEqual(keys.publicKeys, { owner: created.ownerPublicKey, posting: created.postingPublicKey });
    assertSignedBy(await keys.sign('posting', fields), created.postingPublicKey);
    assertSignedBy(await keys.sign('owner', fields), created.ownerPublicKey);
  });

  it('refuses a role it holds no key of', async () => {
    const keys = liteKeyStore(securedIdentity(local, ROOT_KEY, 'https://signer.example', '2027-01-21T12:00:00'), CHAIN_ID);
    assert.deepEqual(Object.keys(keys.publicKeys), ['posting']);
    await assert.rejects(keys.sign('owner', fields), (error: unknown) => error instanceof LiteKeyStoreError && error.code === 'key_not_held');
  });

  it('signs a Safe Storage identity with hb-auth, by the hb-auth key type of the same name', async () => {
    const { client, moved, wallet, unlocks } = await inWallet();
    const keys = liteKeyStore(moved, CHAIN_ID, wallet);
    assert.equal(keys.kind, 'safe-storage');
    assert.deepEqual(keys.publicKeys, { owner: created.ownerPublicKey, posting: created.postingPublicKey });
    assertSignedBy(await keys.sign('posting', fields), created.postingPublicKey);
    assertSignedBy(await keys.sign('owner', fields), created.ownerPublicKey);
    const username = liteWalletUsername(moved);
    assert.deepEqual(client.calls.slice(-2), [`sign ${username} posting`, `sign ${username} owner`]);
    assert.deepEqual(unlocks, []);
  });

  it('runs the unlock step before signing with a locked entry, and only then', async () => {
    const { client, moved, wallet, unlocks } = await inWallet();
    await client.logout(liteWalletUsername(moved));
    const keys = liteKeyStore(moved, CHAIN_ID, wallet);
    assertSignedBy(await keys.sign('posting', fields), created.postingPublicKey);
    assertSignedBy(await keys.sign('posting', fields), created.postingPublicKey);
    assert.deepEqual(unlocks, ['posting']);
  });

  it('sends nothing to sign when the unlock step fails', async () => {
    const { client, moved } = await inWallet();
    await client.logout(liteWalletUsername(moved));
    const refused = new Error('Invalid credentials');
    const keys = liteKeyStore(moved, CHAIN_ID, { client: async () => client, unlock: () => Promise.reject(refused) });
    await assert.rejects(keys.sign('posting', fields), refused);
    assert.equal(client.calls.some((call) => call.startsWith('sign ')), false);
  });

  it('cannot sign for a Safe Storage identity without the wallet', () => {
    assert.throws(() => liteKeyStore(inSafeStorage(local), CHAIN_ID), (error: unknown) => error instanceof LiteKeyStoreError && error.code === 'no_wallet');
  });
});

describe('the Safe Storage entry of a lite identity', () => {
  it('is named by the DID, which no Hive account can be, tagged with the posting key', () => {
    const username = liteWalletUsername(local);
    assert.equal(username, `did:lite:quiet-heron-271:${created.postingPublicKey.slice(3, 11)}`);
    assert.notEqual(username, local.name);
    const other = createLiteIdentity('quiet-heron-271');
    assert.notEqual(liteWalletUsername(other), username);
  });

  it('registers the owner key, then the posting key, and the record keeps no WIF', async () => {
    const client = new FakeWalletClient();
    const moved = await moveKeysToSafeStorage(local, PASSWORD, client);
    const username = liteWalletUsername(local);
    assert.deepEqual(client.calls, [`register ${username} owner`, `register ${username} posting`]);
    assert.deepEqual([...(client.wallets.get(username)?.keys.entries() ?? [])], [
      ['owner', created.ownerWif],
      ['posting', created.postingWif]
    ]);
    assert.equal(moved.keyStore, 'safe-storage');
    assert.deepEqual([moved.ownerWif, moved.postingWif], [undefined, undefined]);
    assert.equal(client.wallets.has(local.name), false);
  });

  it('registers only the posting key of an identity a passkey secured', async () => {
    const client = new FakeWalletClient();
    const secured = securedIdentity(local, ROOT_KEY, 'https://signer.example', '2027-01-21T12:00:00');
    const moved = await moveKeysToSafeStorage(secured, PASSWORD, client);
    assert.deepEqual(client.calls, [`register ${liteWalletUsername(secured)} posting`]);
    assert.deepEqual(liteKeyStore(moved, CHAIN_ID, { client: async () => client, unlock: async () => {} }).publicKeys, {
      posting: created.postingPublicKey
    });
  });

  it('replaces a key an unfinished attempt left, and keeps the record when hb-auth refuses', async () => {
    const client = new FakeWalletClient();
    const username = liteWalletUsername(local);
    await client.register(username, PASSWORD, created.ownerWif, 'owner');
    await client.logout(username);
    await assert.rejects(moveKeysToSafeStorage(local, 'another password', client), /Invalid credentials/);
    const moved = await moveKeysToSafeStorage(local, PASSWORD, client);
    assert.deepEqual(client.calls, [
      `register ${username} owner`,
      `logout ${username}`,
      `invalidate ${username} owner`,
      `register ${username} owner`,
      `register ${username} owner`,
      `register ${username} posting`
    ]);
    assert.equal(client.wallets.get(username)?.keys.get('posting'), created.postingWif);
    assert.equal(moved.keyStore, 'safe-storage');
  });

  it('takes out the owner key a passkey root replaced, leaving the posting key', async () => {
    const { client, moved } = await inWallet();
    await dropWalletKey(moved, 'owner', client);
    const entry = await client.getRegisteredUserByUsername(liteWalletUsername(moved));
    assert.deepEqual(entry?.registeredKeyTypes.filter((type) => type === 'owner' || type === 'posting'), ['posting']);
  });

  it('is removed with its session, every key and its passkey', async () => {
    const { client, moved } = await inWallet();
    const username = liteWalletUsername(moved);
    client.passkeys.add(username);
    assert.equal(await isWalletUnlocked(moved, client), true);
    await removeWalletEntry(moved, client);
    assert.deepEqual(client.calls.slice(-4), [
      `logout ${username}`,
      `invalidate ${username} owner`,
      `invalidate ${username} posting`,
      `removePasskey ${username}`
    ]);
    assert.equal(await isWalletUnlocked(moved, client), false);
    await assert.rejects(client.sign(username, l2Digest(fields, CHAIN_ID), 'posting'), /Not authorized/);
  });

  it('removes nothing for an identity safe storage does not hold', async () => {
    const client = new FakeWalletClient();
    await removeWalletEntry(inSafeStorage(local), client);
    assert.deepEqual(client.calls, []);
  });
});

describe('the reply, edit and delete requests of a Safe Storage identity', () => {
  const apps = { account: 'lite_account_test', posts: 'lite_posts_test' };
  const comment = { parent_author: 'gtg', parent_permlink: 'p1', title: '', body: 'hello', tags: [] };

  it('carry attestations signed by the posting key in the wallet', async () => {
    const { moved, wallet } = await inWallet();
    const keys = liteKeyStore(moved, CHAIN_ID, wallet);
    const common = { identity: moved, keys, chainId: CHAIN_ID, apps };

    const reply = await signedLiteReply({ ...common, gateAccount: 'test-gateway-1', comment });
    assertSignedBy(reply.request.attest_tx, created.postingPublicKey);
    assert.deepEqual(reply.request.register_tx, undefined);

    const edit = await signedLiteEdit({ ...common, l1Author: 'test-gateway-1', permlink: reply.permlink, content: { ...comment, body: 'edited' } });
    assertSignedBy(edit.request.attest_tx, created.postingPublicKey);

    const deleted = await signedLiteDelete({ ...common, l1Author: 'test-gateway-1', permlink: reply.permlink, parentAuthor: 'gtg', parentPermlink: 'p1' });
    assertSignedBy(deleted.request.retract_tx, created.postingPublicKey);
    assert.ok(deleted.request.tombstone_attest_tx);
    assertSignedBy(deleted.request.tombstone_attest_tx, created.postingPublicKey);
  });

  it('register an unregistered identity with its own public keys, unsigned', async () => {
    const fresh = storedFromCreated(createLiteIdentity('fresh-heron-272'));
    const reply = await signedLiteReply({ identity: fresh, keys: liteKeyStore(fresh, CHAIN_ID), gateAccount: 'test-gateway-1', chainId: CHAIN_ID, apps, comment });
    assertSignedBy(reply.request.attest_tx, fresh.postingPublicKey);
    const register = reply.request.register_tx;
    assert.deepEqual(register?.signatures, []);
    assert.equal(JSON.stringify(register).includes(fresh.ownerPublicKey), true);
    assert.equal(JSON.stringify(register).includes(fresh.postingPublicKey), true);
  });
});
