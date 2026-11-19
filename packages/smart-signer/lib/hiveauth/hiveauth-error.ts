/**
 * How a HiveAuth request ended without an answer to use: cancelled here, rejected in the wallet app,
 * not answered before it expired, the relay could not be reached, or the relay or the wallet app
 * reported an error (a lost connection that could not be re-attached included).
 */
export type HiveAuthFailure = 'cancelled' | 'rejected' | 'expired' | 'unreachable' | 'failed';

// The cancel and the rejection read as the user's own (`isUserCancelled`): nothing to report
const MESSAGES: Record<HiveAuthFailure, string> = {
  cancelled: 'The user cancelled the HiveAuth request',
  rejected: 'The user rejected the HiveAuth request in the wallet app',
  expired: 'The HiveAuth request expired before the wallet app answered it',
  unreachable: 'The HiveAuth relay could not be reached',
  failed: 'The HiveAuth request failed'
};

/** smart-signer translation keys of what the HiveAuth dialog says about each failure */
export const HIVEAUTH_FAILURE_KEYS: Record<HiveAuthFailure, string> = {
  cancelled: 'hiveauthservices.cancelled',
  rejected: 'hiveauthservices.userRejectedRequest',
  expired: 'hiveauthservices.requestExpired',
  unreachable: 'hiveauthservices.unreachable',
  failed: 'hiveauthservices.failed'
};

/** A HiveAuth request that ended in `failure`; the HiveAuth dialog has shown it to the user. */
export class HiveAuthError extends Error {
  readonly failure: HiveAuthFailure;

  constructor(failure: HiveAuthFailure, detail?: string) {
    super(detail ? `${MESSAGES[failure]}: ${detail}` : MESSAGES[failure]);
    this.name = 'HiveAuthError';
    this.failure = failure;
  }
}
