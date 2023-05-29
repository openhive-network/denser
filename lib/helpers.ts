import Big from 'big.js';

export function convertStringToBig(number: string): Big {
  const num = new Big(number.split(' ')[0]);
  return num;
}
