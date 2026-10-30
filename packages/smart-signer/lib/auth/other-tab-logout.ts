/**
 * Tells this tab's signers that another tab logged out, ending the session of every account on this
 * origin. Imports nothing that signs: a signer module subscribes when it loads, so a tab that never
 * loaded one, and holds no signer session, loads nothing on another tab's logout.
 */

type OtherTabLogoutListener = () => void;

const listeners = new Set<OtherTabLogoutListener>();

/** Calls `listener` on every logout of another tab; returns the unsubscribe. */
export function subscribeOtherTabLogout(listener: OtherTabLogoutListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reports that another tab's logout ended the session of every account. */
export function notifyOtherTabLogout(): void {
  listeners.forEach((listener) => listener());
}
