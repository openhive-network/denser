import { describe, it } from 'mocha';
import { expect } from 'chai';
import { decodePublicKey, decodeWif, encodePublicKey, encodeWif, generateKeyPair, publicKeyFromPrivate } from './keys';

describe('Hive key encoding', () => {
  it('generates a WIF/STM pair that round-trips', () => {
    const { wif, publicKey } = generateKeyPair();
    const priv = decodeWif(wif);
    expect(priv.length).to.equal(32);
    expect(encodeWif(priv)).to.equal(wif);
    expect(publicKeyFromPrivate(priv)).to.equal(publicKey);
    expect(publicKey.startsWith('STM')).to.equal(true);
    expect(encodePublicKey(decodePublicKey(publicKey))).to.equal(publicKey);
  });
  it('rejects corrupted encodings', () => {
    const { wif, publicKey } = generateKeyPair();
    expect(() => decodeWif(wif.slice(0, -1) + (wif.endsWith('1') ? '2' : '1'))).to.throw();
    expect(() => decodePublicKey(publicKey.slice(0, -1) + (publicKey.endsWith('1') ? '2' : '1'))).to.throw();
    expect(() => decodePublicKey(publicKey, 'TST')).to.throw(/must start with/);
  });
});
