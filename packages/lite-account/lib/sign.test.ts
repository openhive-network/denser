import { describe, it } from 'mocha';
import { expect } from 'chai';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { generateKeyPair } from './keys';
import { recoverPublicKey, signDigest, verifySignature } from './sign';

function isCanonical(sigHex: string): boolean {
  const s = hexToBytes(sigHex);
  const r0 = s[1] ?? 0, r1 = s[2] ?? 0, s0 = s[33] ?? 0, s1 = s[34] ?? 0;
  return !(r0 & 0x80) && !(r0 === 0 && !(r1 & 0x80)) && !(s0 & 0x80) && !(s0 === 0 && !(s1 & 0x80));
}

describe('Hive recoverable signatures over a digest', () => {
  it('signs deterministically, canonically, and recovers the signing key', () => {
    const { wif, publicKey } = generateKeyPair();
    for (let i = 0; i < 25; i++) {
      const digest = bytesToHex(sha256(utf8ToBytes(`message ${i}`)));
      const sig = signDigest(digest, wif);
      expect(sig).to.have.length(130);
      expect(isCanonical(sig)).to.equal(true);
      expect(signDigest(digest, wif)).to.equal(sig);
      expect(recoverPublicKey(digest, sig)).to.equal(publicKey);
      expect(verifySignature(digest, sig, publicKey)).to.equal(true);
    }
  });
  it('does not verify against another key or another digest', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    const digest = bytesToHex(sha256(utf8ToBytes('x')));
    const sig = signDigest(digest, a.wif);
    expect(verifySignature(digest, sig, b.publicKey)).to.equal(false);
    expect(verifySignature(bytesToHex(sha256(utf8ToBytes('y'))), sig, a.publicKey)).to.equal(false);
    expect(verifySignature('00', sig, a.publicKey)).to.equal(false);
  });
});
