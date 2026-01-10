import Big from 'big.js';

/**
 * User level based on VESTS (not HP).
 * VESTS are constant; HP fluctuates with inflation.
 */
export type UserLevel = 'plankton' | 'guppy' | 'minnow' | 'dolphin' | 'orca' | 'whale';

/**
 * VESTS thresholds for each level (community standard).
 * Values are in raw VESTS units.
 */
const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  plankton: 0,
  guppy: 1,
  minnow: 1_000_000,
  dolphin: 10_000_000,
  orca: 100_000_000,
  whale: 1_000_000_000
};

/**
 * Get user level from VESTS amount.
 * @param vests - Raw VESTS value (as Big or number)
 * @returns UserLevel
 */
export function getUserLevel(vests: Big | number): UserLevel {
  const vestsNum = typeof vests === 'number' ? vests : vests.toNumber();

  if (vestsNum >= LEVEL_THRESHOLDS.whale) return 'whale';
  if (vestsNum >= LEVEL_THRESHOLDS.orca) return 'orca';
  if (vestsNum >= LEVEL_THRESHOLDS.dolphin) return 'dolphin';
  if (vestsNum >= LEVEL_THRESHOLDS.minnow) return 'minnow';
  if (vestsNum >= LEVEL_THRESHOLDS.guppy) return 'guppy';
  return 'plankton';
}

/**
 * Get the image path for a user level icon.
 * @param level - UserLevel
 * @returns Path to the level icon image
 */
export function getLevelIconPath(level: UserLevel): string {
  return `/${level}.png`;
}

/**
 * Get display name for a user level.
 * @param level - UserLevel
 * @returns Capitalized level name
 */
export function getLevelDisplayName(level: UserLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Get the minimum VESTS required for a level.
 * @param level - UserLevel
 * @returns Minimum VESTS threshold
 */
export function getLevelThreshold(level: UserLevel): number {
  return LEVEL_THRESHOLDS[level];
}

/**
 * Get the next level above the current one.
 * @param level - Current UserLevel
 * @returns Next UserLevel or null if already whale
 */
export function getNextLevel(level: UserLevel): UserLevel | null {
  const levels: UserLevel[] = ['plankton', 'guppy', 'minnow', 'dolphin', 'orca', 'whale'];
  const currentIndex = levels.indexOf(level);
  if (currentIndex === -1 || currentIndex === levels.length - 1) return null;
  return levels[currentIndex + 1];
}
