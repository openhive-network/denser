// A whole amount in machine format: digits with an optional "." and decimals, or decimals alone.
const MACHINE_DECIMAL_PATTERN = /^-?(\d+(\.\d+)?|\.\d+)$/;

/**
 * `typed` with a decimal comma read as the decimal point: "1,5", as a pl or ru reader types it, is
 * "1.5". Amount inputs are text inputs because Chromium's number input drops the comma ("15").
 */
export const withDecimalPoint = (typed: string): string => typed.trim().replace(',', '.');

/** The amount typed, decimal comma or point, in machine format ("1,5" is "1.5"); "" for text that is not one. */
export const toMachineDecimal = (typed: string): string => {
  const machine = withDecimalPoint(typed);
  return MACHINE_DECIMAL_PATTERN.test(machine) ? machine : '';
};

/** The number an amount input holds, decimal comma or point: "1,5" is 1.5; NaN for an empty or malformed amount. */
export const parseDecimalInput = (typed: string | number): number => {
  if (typeof typed === 'number') return typed;
  const machine = toMachineDecimal(typed);
  return machine === '' ? NaN : Number(machine);
};
