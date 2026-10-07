/**
 * Hive's manabar regeneration (`hive::chain::util::manabar::regenerate_mana`), as wax computes it
 * in its wasm for `calculateCurrentManabarValue` and `calculateManabarFullRegenerationTime`. Plain
 * BigInt arithmetic, so showing a logged-in user's voting power and RC does not load wax.
 * `wax-equivalence.test.ts` checks both against wax.
 */

/** HIVE_VOTING_MANA_REGENERATION_SECONDS: an empty manabar refills in 5 days. */
const MANA_REGENERATION_SECONDS = 432_000n;
const ONE_HUNDRED_PERCENT = 10_000n;

type ManaValue = string | number | bigint;

export interface IManabarValue {
  max: bigint;
  current: bigint;
  /** Percentage of `max`, with two decimal places. */
  percent: number;
}

interface IRegeneratedManabar {
  current: bigint;
  lastUpdateTime: number;
}

const regenerateMana = (
  now: number,
  maxMana: bigint,
  currentMana: bigint,
  lastUpdateTime: number
): IRegeneratedManabar => {
  if (now <= lastUpdateTime) return { current: currentMana >= maxMana ? maxMana : currentMana, lastUpdateTime };
  if (currentMana >= maxMana) return { current: maxMana, lastUpdateTime: now };

  const regenerated = currentMana + (maxMana * BigInt(now - lastUpdateTime)) / MANA_REGENERATION_SECONDS;
  return { current: regenerated >= maxMana ? maxMana : regenerated, lastUpdateTime: now };
};

/** The mana of a manabar at `now` (unix seconds), given its state as of `lastUpdateTime`. */
export const calculateCurrentManabarValue = (
  now: number,
  maxMana: ManaValue,
  currentMana: ManaValue,
  lastUpdateTime: number
): IManabarValue => {
  const max = BigInt(maxMana);
  if (max === 0n) return { max, current: 0n, percent: 100 };

  const { current } = regenerateMana(now, max, BigInt(currentMana), lastUpdateTime);
  return { max, current, percent: Number((current * ONE_HUNDRED_PERCENT) / max) / 100 };
};

/** When (unix seconds) the manabar will be full again, given its state as of `lastUpdateTime`. */
export const calculateManabarFullRegenerationTime = (
  now: number,
  maxMana: ManaValue,
  currentMana: ManaValue,
  lastUpdateTime: number
): number => {
  const max = BigInt(maxMana);
  if (max === 0n) return Math.floor(Date.now() / 1000);

  const regenerated = regenerateMana(now, max, BigInt(currentMana), lastUpdateTime);
  return regenerated.lastUpdateTime + Number(((max - regenerated.current) * MANA_REGENERATION_SECONDS) / max);
};
