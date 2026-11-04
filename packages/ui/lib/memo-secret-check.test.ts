import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectSecretInMemo } from './memo-secret-check.ts';

const WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';
const PUBLIC_KEY = 'STM6vJmrwaX5TjgTS9dPH8KsArso5m91fVodJvv91j7G765wqcNM9';

describe('detectSecretInMemo', () => {
  it('flags a WIF private key', () => {
    assert.equal(detectSecretInMemo(WIF), 'wif');
  });

  it('flags a WIF embedded in a sentence, punctuation included', () => {
    assert.equal(detectSecretInMemo(`here is my key: ${WIF}. thanks!`), 'wif');
  });

  it('flags a WIF in a memo marked for encryption', () => {
    assert.equal(detectSecretInMemo(`#${WIF}`), 'wif');
  });

  it('flags a WIF glued to other base58 text', () => {
    assert.equal(detectSecretInMemo(`mykey${WIF}`), 'wif');
    assert.equal(detectSecretInMemo(`${WIF}thanks`), 'wif');
    assert.equal(detectSecretInMemo(`x${WIF}y`), 'wif');
    assert.equal(detectSecretInMemo(`${WIF}x`), 'wif');
    assert.equal(detectSecretInMemo(`5K5H${WIF}`), 'wif');
  });

  it('flags a master password', () => {
    assert.equal(detectSecretInMemo(`P${WIF}`), 'master_password');
    assert.equal(detectSecretInMemo(`my password P${WIF}`), 'master_password');
    assert.equal(detectSecretInMemo(`pw:P${WIF}thanks`), 'master_password');
  });

  it('does not flag a public key', () => {
    assert.equal(detectSecretInMemo(PUBLIC_KEY), null);
    assert.equal(detectSecretInMemo(`memo key ${PUBLIC_KEY}`), null);
  });

  it('does not flag a 51-character string outside the base58 alphabet', () => {
    const notBase58 = `5J0${WIF.slice(3)}`;
    assert.equal(notBase58.length, 51);
    assert.equal(detectSecretInMemo(notBase58), null);
  });

  it('does not flag a WIF-shaped string of the wrong length', () => {
    assert.equal(detectSecretInMemo(WIF.slice(0, 50)), null);
    assert.equal(detectSecretInMemo(`x${WIF.slice(0, 50)}`), null);
  });

  it('does not flag a WIF-shaped string with a bad checksum', () => {
    const badChecksum = `${WIF.slice(0, 50)}h`;
    assert.equal(badChecksum.length, 51);
    assert.equal(detectSecretInMemo(badChecksum), null);
    assert.equal(detectSecretInMemo(`mykey${badChecksum}thanks`), null);
    assert.equal(detectSecretInMemo(`P${badChecksum}`), null);
  });

  it('does not flag random base58 text full of WIF-like windows', () => {
    assert.equal(detectSecretInMemo('5K'.repeat(40)), null);
    assert.equal(detectSecretInMemo(`5H${'z'.repeat(60)}`), null);
  });

  it('does not flag a base58 string with the wrong version prefix', () => {
    assert.equal(detectSecretInMemo(`5A${WIF.slice(2)}`), null);
  });

  it('does not flag an empty or ordinary memo', () => {
    assert.equal(detectSecretInMemo(''), null);
    assert.equal(detectSecretInMemo('thanks for the coffee'), null);
  });
});
