/**
 * Hive reputation comes in two shapes that must not be guessed from magnitude.
 *
 * - Calibrated (bridge / hivemind `author_reputation` and `get_profile.reputation`):
 *   already on the display scale, including values above 100 (e.g. 100.99).
 * - Raw (`condenser_api.get_account_reputations` share_type): an integer.
 *   Anything below 1e9 displays as 25, so `abs(input) < 1e9` is NOT a calibrated score.
 *
 * Call {@link accountReputation} for calibrated values and {@link rawAccountReputation}
 * for raw share_type. A raw value passed to accountReputation is not converted.
 */

const floorCalibrated = (input: string | number): number => {
  if (typeof input === 'string') {
    input = Number(input);
  }

  if (!Number.isFinite(input) || input === 0) {
    return 25;
  }

  return Math.floor(input);
};

/**
 * Display score for an already-calibrated reputation.
 *
 * @example
 * accountReputation(100.99) // 100
 * accountReputation(0) // 25
 */
export const accountReputation = (input: string | number): number => {
  return floorCalibrated(input);
};

/**
 * Display score for a raw reputation share_type.
 * Formula: (log10(abs(raw)) - 9) * 9 + 25, with the pre-sign clamp used by condenser.
 *
 * @example
 * rawAccountReputation('95832978796820') // 69
 * rawAccountReputation(36150048) // 25 (raw below 1e9, not the integer 36150048)
 * rawAccountReputation(0) // 25
 */
export const rawAccountReputation = (input: string | number): number => {
  if (typeof input === 'string') {
    input = Number(input);
  }

  if (!Number.isFinite(input) || input === 0) {
    return 25;
  }

  const neg = input < 0;
  let reputationLevel = Math.log10(Math.abs(input));
  reputationLevel = Math.max(reputationLevel - 9, 0);

  if (neg) reputationLevel *= -1;

  reputationLevel = reputationLevel * 9 + 25;

  return Math.floor(reputationLevel);
};

export default accountReputation;
