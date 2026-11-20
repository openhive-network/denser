/**
 * Math utility functions that have no external blockchain dependencies.
 * Safe to import from Playwright tests and other Node.js environments.
 */
import Big from 'big.js';
import { createLocaleFormatCache, getFormatOrEnglish, type LocaleFormatCache } from './locale-format-cache';

const ABBREVIATION_SUFFIXES = ['K', 'M', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];
const THOUSAND = new Big(1000);

const abbreviationFormats = new Map<number, LocaleFormatCache<Intl.NumberFormat>>();
const abbreviationFormat = (locale: string, maxDecimals: number) => {
  let cache = abbreviationFormats.get(maxDecimals);
  if (!cache) {
    cache = createLocaleFormatCache(
      // eslint-disable-next-line no-restricted-syntax -- the locale formatting module's own formatter
      (lang) => new Intl.NumberFormat(lang, { maximumFractionDigits: maxDecimals, useGrouping: false })
    );
    abbreviationFormats.set(maxDecimals, cache);
  }
  return getFormatOrEnglish(cache, locale);
};

// `minimumFractionDigits: 1` makes the formatter print the locale's decimal separator after the
// integer part, which `formatDecimal` takes and pairs with the exact fraction.
const integerFormats = createLocaleFormatCache(
  // eslint-disable-next-line no-restricted-syntax -- the locale formatting module's own formatter
  (lang) => new Intl.NumberFormat(lang, { minimumFractionDigits: 1 })
);

/**
 * `amount` shortened with a suffix for its power of 1000 (K, M, T, …) and at most `maxDecimals`
 * decimals, trailing zeros dropped, in `locale`'s decimal separator: "540", "12K", "1.23M", in pl
 * "1,23M". An amount that rounds up to 1000 of a unit takes the next one ("1M", not "1000K").
 */
export function getRoundedAbbreveration(amount: Big, locale: string, maxDecimals = 2): string {
  let suffixIndex = 0;
  let scaled = amount;
  while (suffixIndex < ABBREVIATION_SUFFIXES.length && scaled.abs().round(maxDecimals).gte(THOUSAND)) {
    scaled = scaled.div(THOUSAND);
    suffixIndex++;
  }
  const number = abbreviationFormat(locale, maxDecimals).format(scaled.round(maxDecimals).toNumber());
  return suffixIndex === 0 ? number : number + ABBREVIATION_SUFFIXES[suffixIndex - 1];
}

/**
 * `amount` exactly, rounded to `decimals` decimals, with `locale`'s thousands grouping and decimal
 * separator: "12,000.000" in en, "12 000,000" (non-breaking spaces) in pl.
 */
export function formatDecimal(amount: Big, decimals: number, locale: string): string {
  const rounded = amount.round(decimals);
  const [whole, fraction] = rounded.abs().toFixed(decimals).split('.');
  const parts = getFormatOrEnglish(integerFormats, locale).formatToParts(BigInt(whole));
  const decimalIndex = parts.findIndex((part) => part.type === 'decimal');
  const integer = parts
    .slice(0, decimalIndex === -1 ? parts.length : decimalIndex)
    .map((part) => part.value)
    .join('');
  const decimalSeparator = parts[decimalIndex]?.value ?? '.';
  const sign = rounded.lt(0) ? '-' : '';
  return fraction === undefined ? `${sign}${integer}` : `${sign}${integer}${decimalSeparator}${fraction}`;
}
