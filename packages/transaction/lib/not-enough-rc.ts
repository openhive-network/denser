import { describeError } from './describe-error';

export interface NotEnoughRc {
  /** RC mana the payer had, when the node reported it */
  current: number | null;
  /** RC mana the transaction needed, when the node reported it */
  needed: number | null;
}

// hived rejects with `not_enough_rc_exception` ("payer has not enough RC mana for transaction")
// and puts the amounts in the exception's `data`; wax nests that JSON, possibly escaped, in its message.
const NOT_ENOUGH_RC_PATTERN = /not_enough_rc_exception|has not enough RC mana/i;
const RC_CURRENT_PATTERN = /\\*"rc_current\\*"\s*:\s*"?(\d+)/;
const RC_NEEDED_PATTERN = /\\*"rc\\*"\s*:\s*"?(\d+)/;

function readAmount(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text);
  return match ? Number(match[1]) : null;
}

/**
 * The RC shortfall a broadcast was rejected for, or null when `error` is not such a rejection.
 */
export function findNotEnoughRc(error: unknown): NotEnoughRc | null {
  const text = describeError(error);
  if (!NOT_ENOUGH_RC_PATTERN.test(text)) return null;
  return { current: readAmount(text, RC_CURRENT_PATTERN), needed: readAmount(text, RC_NEEDED_PATTERN) };
}
