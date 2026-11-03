// Owned by SignerPeakvault, but kept out of signer-peakvault.ts so its test can load it: that
// file pulls in the app's path aliases, which node's test runner does not resolve.

// Also declared in signer-peakvault.ts; repeated so this module type-checks on its own.
declare global {
  interface Window {
    peakvault: any;
  }
}

interface PeakVaultResponse {
  success?: boolean;
  result?: unknown;
}

export class PeakVaultNotInstalledError extends Error {
  name = 'PeakVaultNotInstalledError';
}

/**
 * Decrypts `encodedMemo` with `username`'s MEMO key in Peak Vault. Calls the extension rather than
 * `PeakVaultProvider.decryptData`, which returns the response's `result` unchecked: a response
 * that is not a success would resolve to `undefined` and be taken for a decoded memo.
 *
 * @throws {PeakVaultNotInstalledError} when the extension is missing
 * @throws Peak Vault's response itself (`{ success: false, error, message }`) when it holds no decoded memo,
 *   so `isWalletRequestRejected` can tell a rejected request
 */
export async function decryptMemoWithPeakVault(username: string, encodedMemo: string): Promise<string> {
  if (typeof window !== 'object' || typeof window.peakvault !== 'object' || window.peakvault === null) {
    throw new PeakVaultNotInstalledError('Peak Vault is not installed');
  }
  const response: PeakVaultResponse | undefined = await window.peakvault.requestDecode(
    username,
    encodedMemo,
    'memo'
  );
  if (!response) throw new Error('Peak Vault returned no response');
  if (!response.success || typeof response.result !== 'string') throw response;
  return response.result;
}
