export type MemoSecretKind = 'wif' | 'master_password';

// A Hive WIF is base58(0x80 || 32-byte key || 4-byte checksum): 51 characters, and that version
// byte pins the first two to 5H, 5J or 5K. The checksum is not verified: no synchronous SHA-256 is
// available to this package in the browser.
const WIF_PATTERN = /^5[HJK][1-9A-HJ-NP-Za-km-z]{49}$/;
// Maximal base58 runs, so punctuation around a key (a trailing period, the `#` of a memo to be
// encrypted) does not hide it.
const BASE58_RUN = /[1-9A-HJ-NP-Za-km-z]+/g;
const MASTER_PASSWORD_PREFIX = 'P';

const isWif = (token: string): boolean => WIF_PATTERN.test(token);

const classifyToken = (token: string): MemoSecretKind | null => {
  if (isWif(token)) return 'wif';
  if (token.startsWith(MASTER_PASSWORD_PREFIX) && isWif(token.slice(MASTER_PASSWORD_PREFIX.length))) {
    return 'master_password';
  }
  return null;
};

/**
 * Reports whether a plaintext memo contains something shaped like a WIF private key or a master
 * password (`'P' + WIF`, as denser generates them); returns the first kind found, or null.
 */
export function detectSecretInMemo(memo: string): MemoSecretKind | null {
  for (const [token] of memo.matchAll(BASE58_RUN)) {
    const kind = classifyToken(token);
    if (kind) return kind;
  }
  return null;
}
