import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLiteIdentity } from '@hiveio/lite-account';

const {
  canSecureInSafeStorage,
  canSecureWithPasskey,
  graduatedIdentity,
  heldKeyRoles,
  inSafeStorage,
  liteKeyStoreKind,
  readStoredLiteIdentity,
  securedIdentity,
  signedInIdentity,
  storedFromCreated
} = await import('./lite-identity-record.ts');

const NOW = Date.parse('2026-10-23T12:00:00Z');
const created = createLiteIdentity('brave-otter-4823', NOW);
const ROOT_KEY = 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4';
const SIGNER = 'https://signer.syncad.com';

describe('readStoredLiteIdentity', () => {
  it('reads an identity stored before passkeys as unsecured, keeping its owner key', () => {
    const legacy = JSON.parse(JSON.stringify({ ...created, registered: true }));
    const stored = readStoredLiteIdentity(legacy);
    assert.equal(stored?.secured, false);
    assert.equal(stored?.ownerWif, created.ownerWif);
    assert.equal(stored?.ownerPublicKey, created.ownerPublicKey);
    assert.equal(stored?.postingWif, created.postingWif);
    assert.equal(stored?.registered, true);
    assert.equal(stored?.signer, undefined);
  });

  it('reads a secured identity without an owner key, with its signer and device expiry', () => {
    const stored = readStoredLiteIdentity(
      securedIdentity(storedFromCreated(created), ROOT_KEY, SIGNER, '2027-01-21T12:00:00')
    );
    assert.equal(stored?.secured, true);
    assert.equal(stored?.ownerWif, undefined);
    assert.equal(stored?.ownerPublicKey, ROOT_KEY);
    assert.equal(stored?.signer, SIGNER);
    assert.equal(stored?.deviceExpires, '2027-01-21T12:00:00');
  });

  it('reads the Hive account a graduated identity became, and none before', () => {
    const secured = securedIdentity(storedFromCreated(created), ROOT_KEY, SIGNER, '2027-01-21T12:00:00');
    assert.equal(readStoredLiteIdentity(secured)?.graduated, undefined);
    const stored = readStoredLiteIdentity(JSON.parse(JSON.stringify(graduatedIdentity(secured, 'brave-otter'))));
    assert.equal(stored?.graduated, 'brave-otter');
    assert.deepEqual([stored?.secured, stored?.postingWif], [true, created.postingWif]);
    assert.equal(readStoredLiteIdentity({ ...secured, graduated: 7 })?.graduated, undefined);
  });

  it('is null for anything that is not an identity', () => {
    for (const raw of [
      null,
      undefined,
      'lite',
      42,
      {},
      { name: 'x' },
      { name: '', postingWif: 'w', postingPublicKey: 'p' }
    ]) {
      assert.equal(readStoredLiteIdentity(raw), null, JSON.stringify(raw));
    }
  });
});

describe('securedIdentity', () => {
  it('drops the owner key and records the root, the signer and the device expiry', () => {
    const secured = securedIdentity(storedFromCreated(created), ROOT_KEY, SIGNER, '2027-01-21T12:00:00');
    assert.equal('ownerWif' in secured, false);
    assert.equal(JSON.stringify(secured).includes(created.ownerWif), false);
    assert.equal(secured.postingWif, created.postingWif);
    assert.deepEqual([secured.secured, secured.ownerPublicKey, secured.signer], [true, ROOT_KEY, SIGNER]);
  });
});

describe('signedInIdentity', () => {
  it('is a registered, secured identity holding a posting key only', () => {
    const identity = signedInIdentity({
      name: 'brave-otter-4823',
      rootKey: ROOT_KEY,
      signer: SIGNER,
      postingWif: created.postingWif,
      postingPublicKey: created.postingPublicKey,
      deviceExpires: '2027-01-21T12:00:00',
      nowMs: NOW
    });
    assert.equal(identity.ownerWif, undefined);
    assert.deepEqual(
      [identity.registered, identity.secured, identity.createdAt],
      [true, true, '2026-10-23T12:00:00.000Z']
    );
    assert.deepEqual(heldKeyRoles(identity), ['posting']);
  });
});

describe('the key store of a stored identity', () => {
  const registered = { ...storedFromCreated(created), registered: true };

  it('reads an identity stored before Safe Storage as local, adding nothing to the record', () => {
    const legacy = JSON.parse(JSON.stringify(registered));
    const stored = readStoredLiteIdentity(legacy);
    assert.ok(stored);
    assert.equal('keyStore' in stored, false);
    assert.equal(liteKeyStoreKind(stored), 'local');
    assert.deepEqual(heldKeyRoles(stored), ['owner', 'posting']);
    assert.deepEqual(JSON.parse(JSON.stringify(stored)), { ...legacy, secured: false });
  });

  it('keeps no WIF once in Safe Storage, and the public keys', () => {
    const moved = inSafeStorage(registered);
    assert.equal(moved.keyStore, 'safe-storage');
    assert.equal(JSON.stringify(moved).includes(created.ownerWif), false);
    assert.equal(JSON.stringify(moved).includes(created.postingWif), false);
    assert.deepEqual([moved.ownerPublicKey, moved.postingPublicKey], [created.ownerPublicKey, created.postingPublicKey]);
    const read = readStoredLiteIdentity(JSON.parse(JSON.stringify(moved)));
    assert.deepEqual(read && [liteKeyStoreKind(read), read.postingPublicKey, heldKeyRoles(read)], [
      'safe-storage',
      created.postingPublicKey,
      ['owner', 'posting']
    ]);
  });

  it('reads a Safe Storage record without any WIF it carries', () => {
    const read = readStoredLiteIdentity({ ...registered, keyStore: 'safe-storage' });
    assert.deepEqual([read?.ownerWif, read?.postingWif], [undefined, undefined]);
  });

  it('holds only the posting key in Safe Storage once a passkey root owns the account', () => {
    const secured = securedIdentity(inSafeStorage(registered), ROOT_KEY, SIGNER, '2027-01-21T12:00:00');
    assert.deepEqual([liteKeyStoreKind(secured), heldKeyRoles(secured)], ['safe-storage', ['posting']]);
  });

  it('secures with a passkey only an unsecured identity holding its owner key, in either store', () => {
    assert.equal(canSecureWithPasskey(registered), true);
    assert.equal(canSecureWithPasskey(inSafeStorage(registered)), true);
    assert.equal(canSecureWithPasskey(storedFromCreated(created)), false);
    assert.equal(canSecureWithPasskey(securedIdentity(registered, ROOT_KEY, SIGNER, '2027-01-21T12:00:00')), false);
  });

  it('moves into Safe Storage the keys of a registered local identity only', () => {
    assert.equal(canSecureInSafeStorage(registered), true);
    assert.equal(canSecureInSafeStorage(securedIdentity(registered, ROOT_KEY, SIGNER, '2027-01-21T12:00:00')), true);
    assert.equal(canSecureInSafeStorage(inSafeStorage(registered)), false);
    assert.equal(canSecureInSafeStorage(storedFromCreated(created)), false);
    const { ownerWif: _owner, ...withoutOwner } = registered;
    assert.equal(canSecureInSafeStorage(withoutOwner), false);
  });
});
