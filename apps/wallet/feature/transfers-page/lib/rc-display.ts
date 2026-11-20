import type Big from 'big.js';
import { formatNumber, getDecimalSeparator } from '@ui/lib/locale-format';
import { toDecimalInput } from '@/wallet/lib/decimal-input';
import { RC_SUMMARY_DECIMALS, roundRcMinimum } from './rc-amount';

const DECIMAL_COMMA = ',';

/** Rounded for reading in `locale`, e.g. `1.45`, pl `1,45`. */
export const formatRcSummary = (billions: Big, locale: string): string =>
  formatNumber(billions, locale, RC_SUMMARY_DECIMALS);

/** A minimum for reading in `locale`, rounded up (see `roundRcMinimum`): `1.604473654` is `1.61`. */
export const formatRcMinimum = (billions: Big, locale: string): string =>
  formatNumber(roundRcMinimum(billions), locale, RC_SUMMARY_DECIMALS);

/**
 * A machine-format amount (`formatRcInput`, or text typed so far) as the amount input of `locale`
 * shows it: never grouped, with the locale's decimal separator (pl `1,45`, es `1000,5`), so that
 * `withDecimalPoint` reads it back unchanged.
 */
export const toRcInputText = (machine: string, locale: string): string =>
  getDecimalSeparator(locale) === DECIMAL_COMMA ? machine.replace('.', DECIMAL_COMMA) : toDecimalInput(machine, locale);
