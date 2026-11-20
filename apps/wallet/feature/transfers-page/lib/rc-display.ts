import type Big from 'big.js';
import { formatNumber } from '@ui/lib/locale-format';
import { RC_SUMMARY_DECIMALS, roundRcMinimum } from './rc-amount';

/** Rounded for reading in `locale`, e.g. `1.45`, pl `1,45`. */
export const formatRcSummary = (billions: Big, locale: string): string =>
  formatNumber(billions, locale, RC_SUMMARY_DECIMALS);

/** A minimum for reading in `locale`, rounded up (see `roundRcMinimum`): `1.604473654` is `1.61`. */
export const formatRcMinimum = (billions: Big, locale: string): string =>
  formatNumber(roundRcMinimum(billions), locale, RC_SUMMARY_DECIMALS);
