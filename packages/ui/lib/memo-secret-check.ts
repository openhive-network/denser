import { sha256 } from '@noble/hashes/sha256';

export type MemoSecretKind = 'wif' | 'master_password';

// A Hive WIF is base58(0x80 || 32-byte key || 4-byte checksum): 51 characters, and that version
// byte pins the first two to 5H, 5J or 5K.
const WIF_LENGTH = 51;
const WIF_START = /^5[HJK]/;
const WIF_VERSION = 0x80;
const WIF_PAYLOAD_BYTES = 33;
const WIF_CHECKSUM_BYTES = 4;
const WIF_BYTES = WIF_PAYLOAD_BYTES + WIF_CHECKSUM_BYTES;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
// Maximal base58 runs, so punctuation around a key (a trailing period, the `#` of a memo to be
// encrypted) does not hide it.
const BASE58_RUN = /[1-9A-HJ-NP-Za-km-z]+/g;
const MASTER_PASSWORD_PREFIX = 'P';

/** Decodes a base58 string into exactly `size` bytes, or null when the value does not fit. */
const decodeBase58 = (text: string, size: number): Uint8Array | null => {
  let value = 0n;
  for (const char of text) value = value * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
  const bytes = new Uint8Array(size);
  for (let i = size - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return value === 0n ? bytes : null;
};

// The checksum is what tells a key from 51 characters of random base58 text that happen to start
// with 5H, 5J or 5K.
const isWif = (candidate: string): boolean => {
  const bytes = decodeBase58(candidate, WIF_BYTES);
  if (!bytes || bytes[0] !== WIF_VERSION) return false;
  const checksum = sha256(sha256(bytes.subarray(0, WIF_PAYLOAD_BYTES)));
  return checksum
    .subarray(0, WIF_CHECKSUM_BYTES)
    .every((byte, i) => byte === bytes[WIF_PAYLOAD_BYTES + i]);
};

// A key can be glued to other base58 text (`mykey<WIF>thanks`), so every 51-character window that
// starts like a WIF is a candidate; a valid one right after a `P` is a master password.
const classifyRun = (run: string): MemoSecretKind | null => {
  for (let index = 0; index + WIF_LENGTH <= run.length; index++) {
    const candidate = run.slice(index, index + WIF_LENGTH);
    if (!WIF_START.test(candidate) || !isWif(candidate)) continue;
    return run[index - 1] === MASTER_PASSWORD_PREFIX ? 'master_password' : 'wif';
  }
  return null;
};

/**
 * Reports whether a plaintext memo contains a WIF private key or a master password (`'P' + WIF`,
 * as denser generates them), anywhere in its text; returns the first kind found, or null.
 */
export function detectSecretInMemo(memo: string): MemoSecretKind | null {
  for (const [run] of memo.matchAll(BASE58_RUN)) {
    const kind = classifyRun(run);
    if (kind) return kind;
  }
  return null;
}
