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
