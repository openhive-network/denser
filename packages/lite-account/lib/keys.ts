import { secp256k1 } from '@noble/curves/secp256k1';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import { base58 } from '@scure/base';

/**
 * Hive (graphene-style) key encoding.
 *   Public key:  PREFIX + base58( compressed_pubkey(33) || ripemd160(compressed_pubkey)[0:4] )
 *   Private WIF: base58( 0x80 || privkey(32) || sha256(sha256(0x80||privkey))[0:4] )
 * A lite account's device key is an ordinary secp256k1 key in exactly this format.
 */
export const DEFAULT_ADDRESS_PREFIX = 'STM';
const WIF_VERSION = 0x80;

export type LiteKeyPair = { wif: string; publicKey: string };

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Encode a compressed secp256k1 public key (33 bytes) as a Hive public-key string. */
export function encodePublicKey(compressed: Uint8Array, prefix = DEFAULT_ADDRESS_PREFIX): string {
  if (compressed.length !== 33) {
    throw new Error(`expected a 33-byte compressed public key, got ${compressed.length}`);
  }
  return prefix + base58.encode(concatBytes(compressed, ripemd160(compressed).slice(0, 4)));
}

/** Decode a Hive public-key string to its 33-byte compressed form (checksum verified). */
export function decodePublicKey(publicKey: string, prefix = DEFAULT_ADDRESS_PREFIX): Uint8Array {
  if (!publicKey.startsWith(prefix)) throw new Error(`public key must start with ${prefix}`);
  const data = base58.decode(publicKey.slice(prefix.length));
  if (data.length !== 37) throw new Error('malformed public key');
  const key = data.slice(0, 33);
  if (!bytesEqual(data.slice(33), ripemd160(key).slice(0, 4))) throw new Error('invalid public key checksum');
  return key;
}

export function publicKeyFromPrivate(priv: Uint8Array, prefix = DEFAULT_ADDRESS_PREFIX): string {
  return encodePublicKey(secp256k1.getPublicKey(priv, true), prefix);
}

export function encodeWif(priv: Uint8Array): string {
  if (priv.length !== 32) throw new Error(`expected a 32-byte private key, got ${priv.length}`);
  const payload = concatBytes(Uint8Array.of(WIF_VERSION), priv);
  return base58.encode(concatBytes(payload, sha256(sha256(payload)).slice(0, 4)));
}

export function decodeWif(wif: string): Uint8Array {
  const data = base58.decode(wif);
  if (data.length !== 37) throw new Error('malformed WIF');
  const payload = data.slice(0, 33);
  if (!bytesEqual(data.slice(33), sha256(sha256(payload)).slice(0, 4))) throw new Error('invalid WIF checksum');
  if (payload[0] !== WIF_VERSION) throw new Error('unexpected WIF version');
  return payload.slice(1);
}

/** A fresh random device key pair (uses the platform CSPRNG). */
export function generateKeyPair(prefix = DEFAULT_ADDRESS_PREFIX): LiteKeyPair {
  const priv = secp256k1.utils.randomPrivateKey();
  return { wif: encodeWif(priv), publicKey: publicKeyFromPrivate(priv, prefix) };
}
