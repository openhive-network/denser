import KeychainProvider from '@hiveio/wax-signers-keychain';

// Owned by SignerKeychain, but kept out of signer-keychain.ts so the casing
// regression test can load it: that file pulls in the app's path aliases
// (@transaction, @smart-signer), which node's test runner does not resolve.

// Also declared in signer-keychain.ts; repeated so this module type-checks on its own.
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
