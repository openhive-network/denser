/**
 * Calculates human-readable reputation score from Hive blockchain reputation value.
 *
 * Bridge/hivemind APIs return an already-calibrated float (~ -25..150+).
 * Condenser / reputation_api may return a raw share_type integer (typically ≥ 1e9).
 *
 * Formula for raw values: reputation = (log10(abs(raw_reputation)) - 9) * 9 + 25
 *
 * @param input - Raw or calibrated reputation (string or number)
 * @returns Human-readable reputation score (integer)
 *
 * @example
 * accountReputation('95832978796820') // returns 72 (raw share_type)
 * accountReputation(100.99) // returns 100 (already calibrated; must NOT re-log)
 * accountReputation(0) // returns 25 (default for new accounts)
 * accountReputation(-1000000000) // returns negative score from raw
 */
const RAW_REPUTATION_THRESHOLD = 1e9;

/**
 * Bridge returns calibrated floats; raw share_type values are always huge (≥ ~1e9).
 * Using abs < 1e9 (not ≤ 100) so scores like 100.99 are not double-transformed
 * into the default 25 badge (hive/denser#920).
 */
const isHumanReadable = (input: number): boolean => {
  return Number.isFinite(input) && input !== 0 && Math.abs(input) < RAW_REPUTATION_THRESHOLD;
};

export const accountReputation = (input: string | number): number => {
  if (typeof input === 'string') {
    input = Number(input);
  }

  if (!Number.isFinite(input)) {
    return 25;
  }

  if (input === 0) {
    return 25;
  }

  if (isHumanReadable(input)) {
    return Math.floor(input);
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
