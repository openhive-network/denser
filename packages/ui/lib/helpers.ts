import { NaiAsset } from '@hiveio/wax';
import Big from 'big.js';

export function convertStringToBig(number: string | NaiAsset): Big {
  if (number === '') throw new Error('Number cant be empty string');
  return new Big(typeof number === 'string' ? number.split(' ')[0] : number.amount);
}
