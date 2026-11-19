/**
 * What signers tell the account menu's key protection (use-key-protection.ts), which owns the
 * dialogs and the sign-in a signer cannot run itself.
 */

/** Dispatched on `window` with the username as `detail` when a signer signed with a plaintext stored WIF key */
export const PLAINTEXT_KEY_USED_EVENT = 'plaintext-wif-key-used';

/** Dispatched on `window` with the username as `detail` when `requestSafeStorageSession` was called */
export const SAFE_STORAGE_SESSION_REQUESTED_EVENT = 'safe-storage-session-requested';

const requestedSessions = new Set<string>();

export function notifyPlaintextKeyUsed(username: string): void {
  window.dispatchEvent(new CustomEvent(PLAINTEXT_KEY_USED_EVENT, { detail: username }));
}

/**
 * Asks for the WIF session of `username` to sign in again through safe storage, which now holds
 * its key unlocked. Kept until taken, so a request made while signing in with WIF, before the
 * session exists, is carried out once it does.
 */
export function requestSafeStorageSession(username: string): void {
  requestedSessions.add(username);
  window.dispatchEvent(new CustomEvent(SAFE_STORAGE_SESSION_REQUESTED_EVENT, { detail: username }));
}

/** Whether a safe storage session was requested for `username`; the request is taken. */
export function takeSafeStorageSessionRequest(username: string): boolean {
  return requestedSessions.delete(username);
}
