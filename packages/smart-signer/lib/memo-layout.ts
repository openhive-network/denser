// A Hive encrypted memo is `#` + base58(from[33] | to[33] | body), body being
// nonce u64 | check u32 | varint length | ciphertext: what hive-js, Keychain, Peakd and
// the wax build denser bundles read and write. The wax build inside the Hive MetaMask snap
// (1.27.6-rc7, in snap 1.6.0 and 1.7.0) serializes the same fields as body | from | to, and
// only parses that order.
export const ENCRYPTED_MEMO_MARKER = '#';
const PUBLIC_KEY_SIZE = 33;
const KEYS_SIZE = 2 * PUBLIC_KEY_SIZE;
const NONCE_AND_CHECK_SIZE = 12;
const MAX_VARINT_BITS = 35;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export class MemoLayoutError extends Error {}

export interface EncryptedMemoParts {
  /** Compressed secp256k1 public key the memo was encrypted from. */
  from: Uint8Array;
  /** Compressed secp256k1 public key the memo was encrypted to. */
  to: Uint8Array;
  /** nonce | check | varint length | ciphertext. */
  body: Uint8Array;
}

const isCompressedPublicKey = (bytes: Uint8Array, offset: number) =>
  bytes[offset] === 0x02 || bytes[offset] === 0x03;

/** Size of the body starting at `offset` when its varint ciphertext length is well formed. */
function readBodySize(bytes: Uint8Array, offset: number): number | undefined {
  let length = 0;
  for (let i = offset + NONCE_AND_CHECK_SIZE, shift = 0; i < bytes.length && shift < MAX_VARINT_BITS; i++, shift += 7) {
    length += (bytes[i] & 0x7f) * 2 ** shift;
    if ((bytes[i] & 0x80) === 0) return i + 1 - offset + length;
  }
  return undefined;
}

function parseStandardLayout(bytes: Uint8Array): EncryptedMemoParts | undefined {
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

function parseSnapLayout(bytes: Uint8Array): EncryptedMemoParts | undefined {
  const bodySize = bytes.length - KEYS_SIZE;
  const isWellFormed =
    bodySize > 0 &&
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

function decodeBase58(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) throw new MemoLayoutError(`Not an encrypted memo: "${char}" is not base58`);
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

function decodeMemoBytes(memo: string): Uint8Array {
  return decodeBase58(memo.startsWith(ENCRYPTED_MEMO_MARKER) ? memo.slice(ENCRYPTED_MEMO_MARKER.length) : memo);
}

function encodeMemo(...chunks: Uint8Array[]): string {
  const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return ENCRYPTED_MEMO_MARKER + encodeBase58(bytes);
}

/**
 * Reads an encrypted memo, with or without its `#`, in either layout. The standard layout wins
 * when both parse, which takes key prefixes and a length byte lining up by chance.
 *
 * @throws {MemoLayoutError} when the text is neither layout.
 */
export function parseEncryptedMemo(memo: string): EncryptedMemoParts {
  const bytes = decodeMemoBytes(memo);
  const parts = parseStandardLayout(bytes) ?? parseSnapLayout(bytes);
  if (!parts) throw new MemoLayoutError('Not an encrypted memo: no from/to public keys around a well-formed body');
  return parts;
}

/** `#` + base58(from | to | body): the memo every Hive wallet reads. @throws {MemoLayoutError} */
export function toStandardMemoLayout(memo: string): string {
  const { from, to, body } = parseEncryptedMemo(memo);
  return encodeMemo(from, to, body);
}

/** `#` + base58(body | from | to): the only memo the MetaMask snap's `hive_decrypt` parses. @throws {MemoLayoutError} */
export function toSnapMemoLayout(memo: string): string {
  const { from, to, body } = parseEncryptedMemo(memo);
  return encodeMemo(body, from, to);
}
