/**
 * Tells this tab's signers that a logout, of this tab or another one, ended the session of every
 * account on this origin. Imports nothing that signs: a signer module subscribes when it loads, so a
 * tab that never loaded one, and holds no signer session, loads nothing on a logout.
 */
import { advanceSignOutEpoch } from '@hive/common-hiveio-packages/sign-out-epoch';

type LogoutListener = () => void;

const listeners = new Set<LogoutListener>();

/** Calls `listener` on every logout, of this tab or another one; returns the unsubscribe. */
export function subscribeLogout(listener: LogoutListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reports that another tab's logout ended the session of every account. */
export function notifyOtherTabLogout(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Reports that this tab's logout ends the session of every account. Starts a new sign-out epoch first,
 * before other tabs see the logout: an hb-auth worker no page heard of it from is logged out of once a
 * page connects to it.
 */
export function notifyOwnLogout(): void {
  advanceSignOutEpoch();
  listeners.forEach((listener) => listener());
}
