import type { User } from '@smart-signer/types/common';

/**
 * Tells this tab's signers that another tab logged out, ending the session of `accounts`. Imports
 * nothing that signs: a signer module subscribes when it loads, so a tab that never loaded one,
 * and holds no signer session, loads nothing on another tab's logout.
 */

type OtherTabLogoutListener = (accounts: User[]) => void;

const listeners = new Set<OtherTabLogoutListener>();

/** Calls `listener` with the accounts of every session another tab's logout ends; returns the unsubscribe. */
export function subscribeOtherTabLogout(listener: OtherTabLogoutListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reports that another tab's logout ended the session of `accounts`. */
export function notifyOtherTabLogout(accounts: User[]): void {
  listeners.forEach((listener) => listener(accounts));
}
