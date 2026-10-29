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
        reject(new Error(response.error ?? 'Keychain request failed', { cause: response }));
      } else {
        resolve(response.result);
      }
    });
  });
}

/**
 * Bypasses `KeychainProvider` for memo *encoding* and calls the extension's
 * `encodeMessage` directly, with the capitalized `'Memo'` key type it
 * exact-matches (`hive-keychain-commons`'s `KeychainKeyTypes`; any other casing
 * silently falls back to the account's POSTING key, producing undecryptable
 * ciphertext). `KeychainProvider` sends `'Memo'` too since wax !655, but routes a
 * memo addressed to the sender's own account through `requestSignBuffer`, which
 * returns a signature rather than an encrypted memo.
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

/** Decrypts via the standard `KeychainProvider`, which requests the `'Memo'` key type. */
export async function decryptMemoWithKeychain(username: string, encodedMemo: string): Promise<string> {
  const provider = KeychainProvider.for(username, 'memo');
  return provider.decryptData(encodedMemo);
}
