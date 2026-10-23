import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLiteIdentity } from '@hiveio/lite-account';

const { readStoredLiteIdentity, securedIdentity, signedInIdentity, signingIdentity, storedFromCreated } =
  await import('./lite-identity-record.ts');

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
    assert.equal(signingIdentity(identity).ownerWif, '');
  });
});
