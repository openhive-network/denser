import type { TPublicKey } from '@hiveio/wax';
import {
  decryptMemoWithProvider,
  encryptMemoWithProvider,
  type MemoEncryptionProvider
} from '@smart-signer/lib/memo-crypto';
import { toSnapMemoLayout, toStandardMemoLayout } from '@smart-signer/lib/memo-layout';

// Owned by SignerMetaMask, but kept out of signer-metamask.ts so it can be tested under node's
// type stripping, without the app's path aliases that file pulls in.
//
// The snap's `hive_encrypt` and `hive_decrypt` run its bundled wax's `encrypt`/`decrypt`: `#` +
// base58 out, `#` + base58 in, in the snap's own field order (see memo-layout). These wrappers
// convert at that boundary, so the chain only ever sees the standard layout. A snap release on a
// wax that writes the standard layout needs `toSnapMemoLayout` dropped from the decrypt.

/** Encrypts `memo` from the snap's memo key to `toAccountMemoPublicKey`; returns a standard `#` memo. */
export async function encryptMemoWithMetaMaskSnap(
  provider: MemoEncryptionProvider,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return toStandardMemoLayout(await encryptMemoWithProvider(provider, toAccountMemoPublicKey, memo));
}

/** Decrypts a `#` memo in either layout with the snap's memo key; returns `#` + the plaintext. */
export async function decryptMemoWithMetaMaskSnap(
  provider: MemoEncryptionProvider,
  encodedMemo: string
): Promise<string> {
  return decryptMemoWithProvider(provider, toSnapMemoLayout(encodedMemo));
}
