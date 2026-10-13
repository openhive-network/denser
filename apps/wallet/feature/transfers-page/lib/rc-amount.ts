import Big from 'big.js';

/** The Resource Credits section shows RC in billions: the delegate form uses the same unit. */
const RC_PER_BILLION = new Big(1_000_000_000);
/** One raw RC in billions: the input's finest step. */
export const RC_INPUT_DECIMALS = 9;
const RC_SUMMARY_DECIMALS = 2;

/** Parses the amount typed in billions of RC; anything that is not a non-negative number is 0. */
export const parseRcBillions = (input: string): Big => {
  if (!/^\d*(\.\d*)?$/.test(input) || !/\d/.test(input)) return new Big(0);
  return new Big(input);
};

export const rawRcToBillions = (raw: string): Big => new Big(raw || '0').div(RC_PER_BILLION);

/** The integer RC count `billions` stands for, as the delegate operation expects it. */
export const billionsToRawRc = (billions: Big): string => billions.times(RC_PER_BILLION).round(0, Big.roundDown).toFixed(0);

/** Every raw RC digit, without trailing zeros: the form input's value. */
export const formatRcInput = (billions: Big): string =>
  billions.toFixed(RC_INPUT_DECIMALS).replace(/\.?0+$/, '');

/** Rounded for reading, e.g. `1.45`. */
export const formatRcSummary = (billions: Big): string => billions.toFixed(RC_SUMMARY_DECIMALS);

/** `percent` of `maxBillions`, rounded down to a whole RC so it never exceeds the maximum. */
export const rcForPercent = (maxBillions: Big, percent: number): Big =>
  maxBillions.times(RC_PER_BILLION).times(percent).div(100).round(0, Big.roundDown).div(RC_PER_BILLION);

/** The share of `maxBillions` that `billions` is, in percent; 0 when there is nothing to delegate. */
export const rcPercentOf = (billions: Big, maxBillions: Big): number =>
  maxBillions.lte(0) ? 0 : Number(billions.times(100).div(maxBillions).toFixed(2));
