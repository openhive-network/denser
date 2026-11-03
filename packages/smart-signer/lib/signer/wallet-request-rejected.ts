/**
 * The codes Keychain and Peak Vault answer a request the user did not approve with: `user_cancel`
 * for one rejected, `ignored` for one whose window was closed or dropped for a newer request. Their
 * messages are translated to the extension's language, so only the code identifies them.
 */
const REJECTION_CODES = new Set(['user_cancel', 'ignored']);
const MAX_CAUSE_DEPTH = 5;

/**
 * Whether `error` is a wallet extension's answer that the user did not approve the request, rather
 * than a failure of the request itself. Peak Vault rejects with its response
 * (`{ success: false, error, message }`); wax's Keychain provider throws an Error whose `cause` is
 * Keychain's response.
 */
export function isWalletRequestRejected(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && typeof current === 'object' && current !== null; depth++) {
    if ('error' in current && typeof current.error === 'string' && REJECTION_CODES.has(current.error))
      return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}
