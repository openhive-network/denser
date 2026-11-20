import type { NaiAsset } from '@hiveio/wax';
import Big from 'big.js';
import { getAssetConfig, getNaiSymbols } from './asset-constants';

export function convertStringToBig(number: string | NaiAsset): Big {
  if (number === '') throw new Error('Number cant be empty string');
  if (typeof number === 'string') {
    return new Big(number.split(' ')[0]);
  }
  // For NaiAsset, divide amount by 10^precision to get actual value
  return new Big(number.amount).div(new Big(10).pow(number.precision));
}

/**
 * Checks if a NaiAsset is HBD.
 */
export function isHbd(asset: NaiAsset): boolean {
  return asset.nai === getAssetConfig().HBD.nai;
}

/**
 * Checks if a NaiAsset is HIVE.
 */
export function isHive(asset: NaiAsset): boolean {
  return asset.nai === getAssetConfig().HIVE.nai;
}

/**
 * Checks if a NaiAsset is VESTS.
 */
export function isVests(asset: NaiAsset): boolean {
  return asset.nai === getAssetConfig().VESTS.nai;
}

/**
 * A NaiAsset in the chain's legacy string form, "1.234 HIVE": every decimal, no grouping, the token
 * name after. For data the API speaks (an entry's `max_accepted_payout`), not for display: that is
 * `formatAsset` with the active locale.
 * @param asset - The NaiAsset to format
 * @param overrideSymbol - Optional symbol override (e.g., 'HP' instead of 'HIVE')
 */
export function formatNaiAsset(asset: NaiAsset, overrideSymbol?: string): string {
  const amount = Big(asset.amount).div(Big(10).pow(asset.precision));
  const naiSymbols = getNaiSymbols();
  const symbol = overrideSymbol || naiSymbols[asset.nai] || '';
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the chain's own asset string, not display text
  return `${amount.toFixed(asset.precision)} ${symbol}`;
}
