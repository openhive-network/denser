// A leading `#` asks for a memo to be encrypted, and marks one that was (hive-js, Keychain).
const ENCRYPTED_MEMO_MARKER = '#';

/** A memo's ciphertext, with the plaintext and recipient it was made for. */
export interface EncryptedMemo {
  plaintext: string;
  toAccount: string;
  ciphertext: string;
}

export const hasEncryptedMemoMarker = (memo: string): boolean => memo.startsWith(ENCRYPTED_MEMO_MARKER);

/**
 * The memo to broadcast for `memo` sent to `toAccount`: the memo itself when it does not start with
 * `#`, otherwise the ciphertext made for exactly that plaintext and recipient. Returns null when
 * there is none, so that a memo meant to be encrypted is never broadcast in clear.
 */
export function memoToBroadcast(
  memo: string,
  toAccount: string,
  encrypted: EncryptedMemo | null
): string | null {
  if (!hasEncryptedMemoMarker(memo)) return memo;
  if (encrypted?.plaintext === memo && encrypted.toAccount === toAccount) return encrypted.ciphertext;
  return null;
}
