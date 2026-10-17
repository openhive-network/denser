/**
 * Messages of operations the user cancelled: a dismissed password dialog, or a request rejected
 * in a wallet (MetaMask's "User rejected the request.", "User denied ..."). Phrased with "user" so
 * that a node or API error which merely says "rejected" is not taken for one.
 */
const USER_CANCELLED_PATTERNS = [
  'no password from user',
  'user rejected',
  'rejected by the user',
  'user denied',
  'user cancelled'
];

/** Whether `error` is the user's own cancel: not a failure, nothing to show or report */
export function isUserCancelled(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return USER_CANCELLED_PATTERNS.some((pattern) => msg.includes(pattern));
}
