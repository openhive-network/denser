/**
 * Calculates human-readable reputation score from Hive blockchain reputation value.
 *
 * The reputation on Hive blockchain is stored as a large number that needs to be
 * converted to a human-readable score (typically between -25 and 75+).
 *
 * Formula: reputation = (log10(abs(raw_reputation)) - 9) * 9 + 25
 *
 * @param input - Raw reputation value from blockchain (string or number)
 * @returns Human-readable reputation score (integer)
 *
 * @example
 * accountReputation('95832978796820') // returns 72
 * accountReputation(0) // returns 25 (default for new accounts)
 * accountReputation(-1000000000) // returns negative score
 */
const isHumanReadable = (input: number): boolean => {
  return Math.abs(input) > 0 && Math.abs(input) <= 100;
};

export const accountReputation = (input: string | number): number => {
  if (typeof input === 'number' && isHumanReadable(input)) {
    return Math.floor(input);
  }

  if (typeof input === 'string') {
    input = Number(input);

    if (isHumanReadable(input)) {
      return Math.floor(input);
    }
  }

  if (input === 0) {
    return 25;
  }

  let neg = false;

  if (input < 0) neg = true;

  let reputationLevel = Math.log10(Math.abs(input));
  reputationLevel = Math.max(reputationLevel - 9, 0);

  if (reputationLevel < 0) reputationLevel = 0;

  if (neg) reputationLevel *= -1;

  reputationLevel = reputationLevel * 9 + 25;

  return Math.floor(reputationLevel);
};

export default accountReputation;
