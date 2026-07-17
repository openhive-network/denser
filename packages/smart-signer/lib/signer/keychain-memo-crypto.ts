import KeychainProvider from '@hiveio/wax-signers-keychain';

// Ambiguity re review finding "externalizing keychain functions outside the
// signers interface": could mean (a) own this under signer/, owned by
// SignerKeychain (done here), or (b) literally be private methods on
// SignerKeychain itself. Went with (a) - inlining into signer-keychain.ts
// would break the casing-regression test below (that file pulls in a
// real @hiveio/wax value import, ESM-only, unusable under mocha/CJS).
// Flagging for reviewer to confirm intent.

// Duplicated in signer-keychain.ts: this repo's mocha setup type-checks
// files individually, so each file needs its own declare global.
declare global {
  interface Window {
    hive_keychain: any;
  }
}

interface KeychainCallbackResponse {
  success: boolean;
  error?: string;
  result?: string;
}

function requestKeychain(
  invoke: (callback: (response: KeychainCallbackResponse) => void) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    invoke((response) => {
      if (!response.success || response.error || response.result === undefined) {
        reject(new Error(response.error ?? 'Keychain request failed'));
      } else {
        resolve(response.result);
      }
    });
  });
}

/**
 * Bypasses `KeychainProvider` for memo *encoding* and calls the extension
 * directly. `KeychainProvider` sends lowercase `'memo'`, but the extension's
 * `encodeMessage` handler exact-matches against capitalized `'Memo'`
 * (`hive-keychain-commons`'s `KeychainKeyTypes`) - a mismatch silently falls
 * back to the account's POSTING key, producing undecryptable ciphertext.
 * Decoding isn't affected (case-insensitive there), so `decryptMemoWithKeychain`
 * below doesn't need this bypass.
 *
 * Transitional: remove once gitlab.syncad.com/hive/wax !655 is merged/released/
 * pinned here, and go back through `KeychainProvider`.
 */
export async function encryptMemoWithKeychain(
  fromAccount: string,
  toAccount: string,
  memo: string
): Promise<string> {
  return requestKeychain((callback) =>
    window.hive_keychain.requestEncodeMessage(fromAccount, toAccount, memo, 'Memo', callback)
  );
}

/** Decrypts via the standard `KeychainProvider` - decode's key resolution is case-insensitive, so no bypass needed. */
export async function decryptMemoWithKeychain(username: string, encodedMemo: string): Promise<string> {
  const provider = KeychainProvider.for(username, 'memo');
  return provider.decryptData(encodedMemo);
}
