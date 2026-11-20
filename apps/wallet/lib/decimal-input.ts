import { getDecimalSeparator } from '@ui/lib/locale-format';

// A whole amount in machine format: digits with an optional "." and decimals, or decimals alone.
const MACHINE_DECIMAL_PATTERN = /^-?(\d+(\.\d+)?|\.\d+)$/;
const SEPARATOR_PATTERN = /[.,]/g;
const DECIMAL_COMMA = ',';

/**
 * `typed` with its decimal separator as ".": "1,5", as a pl or ru reader types it, is "1.5" in a
 * `locale` that writes a decimal comma. Amount inputs are text inputs because Chromium's number input
 * drops the comma ("15"). null when the separator cannot be told apart from grouping: a "," where
 * `locale` writes a decimal point (en "1,000"), or more than one separator ("1.000,5"). A "." is
 * the decimal point in every locale.
 */
export const withDecimalPoint = (typed: string, locale: string): string | null => {
  const text = typed.trim();
  const separators = text.match(SEPARATOR_PATTERN) ?? [];
  if (separators.length > 1) return null;
  if (separators[0] !== DECIMAL_COMMA) return text;
  return getDecimalSeparator(locale) === DECIMAL_COMMA ? text.replace(DECIMAL_COMMA, '.') : null;
};

/** The amount typed in `locale`, in machine format (pl "1,5" is "1.5"); "" for text that is not one. */
export const toMachineDecimal = (typed: string, locale: string): string => {
  const machine = withDecimalPoint(typed, locale);
  return machine !== null && MACHINE_DECIMAL_PATTERN.test(machine) ? machine : '';
};

/** The number an amount input holds in `locale` (pl "1,5" is 1.5); NaN for an empty or malformed amount. */
export const parseDecimalInput = (typed: string | number, locale: string): number => {
  if (typeof typed === 'number') return typed;
  const machine = toMachineDecimal(typed, locale);
  return machine === '' ? NaN : Number(machine);
};
