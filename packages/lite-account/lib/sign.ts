import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, concatBytes, hexToBytes } from '@noble/hashes/utils';
import { DEFAULT_ADDRESS_PREFIX, decodeWif, encodePublicKey } from './keys';

/**
 * Hive-format recoverable secp256k1 signatures over a 32-byte digest:
 *   65 bytes = [ 27 + 4 + recovery_id ] || r(32) || s(32), hex-encoded,
 * and "canonical" in hived's sense (r and s have no leading 0x80/0x00-then-<0x80 bytes).
 * This is the format hive.pubkey_from_signature recovers from, so the L2 framework
 * verifies these exactly like L1 signatures.
 */
const RECOVERY_BASE = 27 + 4; // +4 = compressed public key
const MAX_ATTEMPTS = 256;

function isCanonical(rs: Uint8Array): boolean {
  const r0 = rs[0] ?? 0;
  const r1 = rs[1] ?? 0;
  const s0 = rs[32] ?? 0;
  const s1 = rs[33] ?? 0;
  return !(r0 & 0x80) && !(r0 === 0 && !(r1 & 0x80)) && !(s0 & 0x80) && !(s0 === 0 && !(s1 & 0x80));
}

function digestBytes(digestHex: string): Uint8Array {
  const digest = hexToBytes(digestHex);
  if (digest.length !== 32) throw new Error('digest must be 32 bytes');
  return digest;
}

function counterEntropy(counter: number): Uint8Array {
  const entropy = new Uint8Array(32);
  entropy[31] = counter & 0xff;
  entropy[30] = (counter >> 8) & 0xff;
  return entropy;
}

/** Sign a hex digest with a WIF; returns the 130-char hex Hive signature. */
export function signDigest(digestHex: string, wif: string): string {
  const digest = digestBytes(digestHex);
  const priv = decodeWif(wif);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const extraEntropy = attempt === 0 ? undefined : counterEntropy(attempt);
    const sig = secp256k1.sign(digest, priv, { lowS: true, extraEntropy });
    const rs = sig.toCompactRawBytes();
    if (isCanonical(rs)) {
      return bytesToHex(concatBytes(Uint8Array.of(RECOVERY_BASE + sig.recovery), rs));
    }
  }
  throw new Error('could not produce a canonical signature');
}

/** Recover the Hive public-key string that produced `signatureHex` over `digestHex`. */
export function recoverPublicKey(
  digestHex: string,
  signatureHex: string,
  prefix = DEFAULT_ADDRESS_PREFIX
): string {
  const sig = hexToBytes(signatureHex);
  if (sig.length !== 65) throw new Error('signature must be 65 bytes');
  const recovery = (sig[0] ?? 0) - RECOVERY_BASE;
  if (recovery < 0 || recovery > 3) throw new Error('signature is not a compressed-key recoverable signature');
  const point = secp256k1.Signature.fromCompact(sig.slice(1)).addRecoveryBit(recovery).recoverPublicKey(digestBytes(digestHex));
  return encodePublicKey(point.toRawBytes(true), prefix);
}

/** True if `signatureHex` over `digestHex` recovers to `publicKey`. */
export function verifySignature(digestHex: string, signatureHex: string, publicKey: string): boolean {
  try {
    return recoverPublicKey(digestHex, signatureHex) === publicKey;
  } catch {
    return false;
  }
}
