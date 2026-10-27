import { ENCRYPTED_MEMO_MARKER, stripEncryptedMemoMarker } from '@smart-signer/lib/memo-crypto';

// A Hive encrypted memo is `#` + base58(from[33] | to[33] | body), where body is
// nonce u64 | check u32 | varint length | ciphertext. The wax build inside the Hive
// MetaMask snap (1.27.6-rc7, in snap 1.6.0 and 1.7.0) writes and reads the same fields
// in another order, body | from | to, which no other wallet parses.
const PUBLIC_KEY_SIZE = 33;
const KEYS_SIZE = 2 * PUBLIC_KEY_SIZE;
const NONCE_AND_CHECK_SIZE = 12;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export class MemoLayoutError extends Error {}

export interface HiveMemoParts {
  /** Compressed secp256k1 public key the memo was encrypted from. */
  from: Uint8Array;
  /** Compressed secp256k1 public key the memo was encrypted to. */
  to: Uint8Array;
  /** nonce | check | varint length | ciphertext. */
  body: Uint8Array;
}

function decodeBase58(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) throw new MemoLayoutError(`Not a base58 memo: unexpected character "${char}"`);
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    for (; carry > 0; carry >>= 8) bytes.push(carry & 0xff);
  }
  for (let i = 0; i < text.length && text[i] === BASE58_ALPHABET[0]; i++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

function encodeBase58(bytes: Uint8Array): string {
  const digits: number[] = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    for (; carry > 0; carry = Math.floor(carry / 58)) digits.push(carry % 58);
  }
  let text = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) text += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) text += BASE58_ALPHABET[digits[i]];
  return text;
}

const isCompressedPublicKey = (bytes: Uint8Array, offset: number) => bytes[offset] === 0x02 || bytes[offset] === 0x03;

/** Size of the body starting at `offset` if its varint ciphertext length is well formed, else undefined. */
function readBodySize(bytes: Uint8Array, offset: number): number | undefined {
  let length = 0;
  for (let i = offset + NONCE_AND_CHECK_SIZE, shift = 0; i < bytes.length && shift < 35; i++, shift += 7) {
    length += (bytes[i] & 0x7f) * 2 ** shift;
    if ((bytes[i] & 0x80) === 0) return i + 1 - offset + length;
  }
  return undefined;
}

function parseStandardLayout(bytes: Uint8Array): HiveMemoParts | undefined {
  const isWellFormed =
    isCompressedPublicKey(bytes, 0) &&
    isCompressedPublicKey(bytes, PUBLIC_KEY_SIZE) &&
    readBodySize(bytes, KEYS_SIZE) === bytes.length - KEYS_SIZE;
  if (!isWellFormed) return undefined;
  return {
    from: bytes.slice(0, PUBLIC_KEY_SIZE),
    to: bytes.slice(PUBLIC_KEY_SIZE, KEYS_SIZE),
    body: bytes.slice(KEYS_SIZE)
  };
}

function parseSnapLayout(bytes: Uint8Array): HiveMemoParts | undefined {
  const bodySize = bytes.length - KEYS_SIZE;
  const isWellFormed =
    readBodySize(bytes, 0) === bodySize &&
    isCompressedPublicKey(bytes, bodySize) &&
    isCompressedPublicKey(bytes, bodySize + PUBLIC_KEY_SIZE);
  if (!isWellFormed) return undefined;
  return {
    from: bytes.slice(bodySize, bodySize + PUBLIC_KEY_SIZE),
    to: bytes.slice(bodySize + PUBLIC_KEY_SIZE),
    body: bytes.slice(0, bodySize)
  };
}

/**
 * Reads an encrypted memo (with or without its `#`) in either layout. The standard layout wins
 * when both parse, which takes a nonce byte and a ciphertext byte lining up by chance.
 *
 * @throws {MemoLayoutError} when it is neither a standard nor a snap-layout memo.
 */
export function parseEncryptedMemo(memo: string): HiveMemoParts {
  const bytes = decodeBase58(stripEncryptedMemoMarker(memo));
  const parts = parseStandardLayout(bytes) ?? parseSnapLayout(bytes);
  if (!parts) throw new MemoLayoutError('Not an encrypted Hive memo');
  return parts;
}

const encodeMemo = (...chunks: Uint8Array[]) =>
  ENCRYPTED_MEMO_MARKER + encodeBase58(Uint8Array.from(chunks.flatMap((chunk) => [...chunk])));

/** `#` + the standard layout every Hive wallet reads. */
export function toStandardMemoLayout(memo: string): string {
  const { from, to, body } = parseEncryptedMemo(memo);
  return encodeMemo(from, to, body);
}

/** `#` + the layout the Hive MetaMask snap's wax reads. */
export function toSnapMemoLayout(memo: string): string {
  const { from, to, body } = parseEncryptedMemo(memo);
  return encodeMemo(body, from, to);
}
