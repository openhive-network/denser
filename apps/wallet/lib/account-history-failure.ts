import { isRestApiUnavailable, ReadTransportError } from '@transaction/lib/read-transport';

/**
 * Why the account history could not be loaded:
 * - `not_served`: no node asked has the history API (404);
 * - `unavailable`: the nodes have it but could not answer now (5xx, timeout, network), worth retrying later;
 * - `failed`: anything else.
 */
export type AccountHistoryFailure = 'not_served' | 'unavailable' | 'failed';

/** Classifies the error an account history read rejected with. */
export const getAccountHistoryFailure = (error: unknown): AccountHistoryFailure => {
  if (!(error instanceof ReadTransportError)) return 'failed';
  if (error.status === 404) return 'not_served';
  return isRestApiUnavailable(error) ? 'unavailable' : 'failed';
};
