import type { NaiAsset } from '@hiveio/wax';
import { getNaiSymbols } from './asset-constants';

export interface IFormatAssetOptions {
  /** Append the token name (`HIVE`, `HBD`, `VESTS`); default true. */
  appendTokenName?: boolean;
}

export const isNaiAsset = (value: unknown): value is NaiAsset =>
  typeof value === 'object' &&
  value !== null &&
  'amount' in value &&
  'precision' in value &&
  'nai' in value &&
  typeof value.amount === 'string' &&
  typeof value.precision === 'number' &&
  typeof value.nai === 'string';

/**
 * The text wax's `chain.formatter.format(asset)` gives for a NaiAsset: the amount with all its
 * `precision` decimals, the integer part grouped and the decimal separator taken from the
 * runtime's default locale, then the token name (`"1,234.567 HIVE"`). Negative amounts keep their
 * exact value (wax's formatter misrenders them). Throws for a NAI that is not a Hive asset.
 */
export function formatAsset(asset: NaiAsset, { appendTokenName = true }: IFormatAssetOptions = {}): string {
  const symbol = getNaiSymbols()[asset.nai];
  if (!symbol) throw new Error(`Unknown asset NAI: ${asset.nai}`);

  const satoshis = BigInt(asset.amount);
  const negative = satoshis < BigInt(0);
  const absolute = negative ? -satoshis : satoshis;
  const scale = BigInt(10) ** BigInt(asset.precision);

  const parts = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1 }).formatToParts(absolute / scale);
  const decimalIndex = parts.findIndex((part) => part.type === 'decimal');
  const integer = parts
    .slice(0, decimalIndex === -1 ? parts.length : decimalIndex)
    .map((part) => part.value)
    .join('');
  const decimalSeparator = parts[decimalIndex]?.value ?? '.';
  const fraction = (absolute % scale).toString().padStart(asset.precision, '0');

  const amount = `${negative ? '-' : ''}${integer}${asset.precision > 0 ? `${decimalSeparator}${fraction}` : ''}`;
  return appendTokenName ? `${amount} ${symbol}` : amount;
}
