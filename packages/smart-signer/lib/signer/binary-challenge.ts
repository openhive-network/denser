import type { LoginType } from '@smart-signer/types/common';

// Peak Vault's `requestSignBuffer` accepts only strings, and its wax provider
// rejects any other challenge before the extension is called.
const LOGIN_TYPES_WITHOUT_BINARY_CHALLENGE: ReadonlySet<string> = new Set(['peakvault']);

/**
 * Whether the signer for `loginType` can sign a binary challenge, such as the
 * `ImageSigningChallenge` + image bytes the imagehoster requires for uploads.
 */
export const canSignBinaryChallenge = (loginType: LoginType): boolean =>
  !LOGIN_TYPES_WITHOUT_BINARY_CHALLENGE.has(loginType);
