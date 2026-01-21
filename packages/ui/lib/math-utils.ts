/**
 * Math utility functions that have no external blockchain dependencies.
 * Safe to import from Playwright tests and other Node.js environments.
 */
import Big from 'big.js';

/**
 * Converts a large number to an abbreviated format with suffix (K, M, T, etc.)
 * @param numToRefactor - The number to format
 * @param toComma - Number of decimal places (default: 2)
 * @param multiplicators - Array of suffixes for powers of 1000
 * @returns Formatted string like "1.23M" or "456.78K"
 */
export function getRoundedAbbreveration(
  numToRefactor: Big,
  toComma = 2,
  multiplicators = ['K', 'M', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q']
) {
  if (numToRefactor.lt(1000)) return numToRefactor.toFixed(toComma);
  let mulIndex = 0;
  for (let t = numToRefactor; t.div(1000).gte(1); mulIndex++) {
    t = t.div(1000);
  }

  return numToRefactor.div(new Big(1000).pow(mulIndex)).toFixed(toComma) + multiplicators[mulIndex - 1];
}
