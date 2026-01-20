import { NaiAsset } from '@hiveio/wax';
import Big from 'big.js';

export function convertStringToBig(number: string | NaiAsset): Big {
  if (number === '') throw new Error('Number cant be empty string');
  if (typeof number === 'string') {
    return new Big(number.split(' ')[0]);
  }
  // For NaiAsset, divide amount by 10^precision to get actual value
  return new Big(number.amount).div(new Big(10).pow(number.precision));
}

export const NAI_SYMBOLS: Record<string, string> = {
  '@@000000021': 'HIVE',
  '@@000000013': 'HBD',
  '@@000000037': 'VESTS'
};

export const NAI_HBD = '@@000000013';
export const NAI_HIVE = '@@000000021';
export const NAI_VESTS = '@@000000037';

/**
 * Checks if a NaiAsset is HBD
 */
export function isHbd(asset: NaiAsset): boolean {
  return asset.nai === NAI_HBD;
}

/**
 * Checks if a NaiAsset is HIVE
 */
export function isHive(asset: NaiAsset): boolean {
  return asset.nai === NAI_HIVE;
}

/**
 * Formats a NaiAsset to a human-readable string like "1.234 HIVE"
 * @param asset - The NaiAsset to format
 * @param overrideSymbol - Optional symbol override (e.g., 'HP' instead of 'HIVE')
 * @returns Formatted string like "1.234 HIVE"
 */
export function formatNaiAsset(asset: NaiAsset, overrideSymbol?: string): string {
  const amount = Big(asset.amount).div(Big(10).pow(asset.precision));
  const symbol = overrideSymbol || NAI_SYMBOLS[asset.nai] || '';
  return `${amount.toFixed(asset.precision)} ${symbol}`;
}
