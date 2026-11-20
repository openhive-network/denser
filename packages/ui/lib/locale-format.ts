/**
 * Display formatting in the active locale: every number, amount, date, relative time, duration and
 * list the apps show goes through this module, with the locale the page renders in
 * (`useLocale().locale`, `i18n.language`). ESLint (`@hive/i18n/no-adhoc-format` in
 * @hive/eslint-config-custom) rejects `toFixed()` digits shown to the user, `toLocale*String()` and
 * Intl formatters built outside it. A NaiAsset formats with `formatAsset(asset, { locale })` of
 * ./asset-format, kept apart so this module loads without the asset constants.
 */
import Big from 'big.js';
import { createLocaleFormatCache, getFormatOrEnglish, type LocaleFormatCache } from './locale-format-cache';
import { formatDecimal, getRoundedAbbreveration } from './math-utils';

export { formatDecimal, getRoundedAbbreveration } from './math-utils';
export {
  getTimeAgoString,
  getUnitsAgoString,
  getRelativeUnitString,
  getTimeAgoTitle,
  getTimeAgoDateTime,
  parseUtcTimestamp,
  type TimeAgoStyle,
  type TimeUnit
} from './time-ago';
export { formatCalendarDate } from './calendar-date';
export { formatMonthYear } from './month-year';
export { formatDateTime, type DateTimeFormatName, type DateTimeZone } from './date-format';
export {
  formatDuration,
  formatLargestUnitDuration,
  type Duration,
  type DurationCase
} from './duration-format';

/** Token names an amount is shown with; every locale keeps them as they are. */
export type AmountSymbol = 'HIVE' | 'HBD' | 'HP' | 'HIVE POWER' | 'VESTS';

const listFormats = {
  conjunction: createLocaleFormatCache(
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    (lang) => new Intl.ListFormat(lang, { type: 'conjunction' })
  ),
  disjunction: createLocaleFormatCache(
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    (lang) => new Intl.ListFormat(lang, { type: 'disjunction' })
  ),
  unit: createLocaleFormatCache(
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    (lang) => new Intl.ListFormat(lang, { type: 'unit', style: 'long' })
  )
};

const fixedFormats = new Map<string, LocaleFormatCache<Intl.NumberFormat>>();
const fixedFormat = (lang: string, style: 'percent' | 'dollars', decimals: number): Intl.NumberFormat => {
  const key = `${style}|${decimals}`;
  let cache = fixedFormats.get(key);
  if (!cache) {
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...(style === 'percent'
        ? { style: 'percent' }
        : { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' })
    };
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    cache = createLocaleFormatCache((locale) => new Intl.NumberFormat(locale, options));
    fixedFormats.set(key, cache);
  }
  return getFormatOrEnglish(cache, lang);
};

const fileSizeFormats = {
  kilobyte: createLocaleFormatCache(
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    (lang) => new Intl.NumberFormat(lang, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 })
  ),
  megabyte: createLocaleFormatCache(
    // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
    (lang) => new Intl.NumberFormat(lang, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })
  )
};

const BYTES_PER_KILOBYTE = 1024;

const plainNumberFormats = createLocaleFormatCache(
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  (lang) => new Intl.NumberFormat(lang)
);

const toBig = (value: Big | number): Big | null =>
  value instanceof Big ? value : Number.isFinite(value) ? new Big(value) : null;

/**
 * `value` rounded to exactly `decimals` decimals, grouped and separated as `lang` writes numbers:
 * "12,000.000" in en, "12 000,000" (non-breaking spaces) in pl. NaN and infinities format as "".
 */
export const formatNumber = (value: Big | number, lang: string, decimals = 0): string => {
  const amount = toBig(value);
  return amount ? formatDecimal(amount, decimals, lang) : '';
};

/** `value` with `decimals` decimals (3, the chain's precision, by default) and its token name: "1,234.500 HBD". */
export const formatAmount = (
  value: Big | number,
  symbol: AmountSymbol,
  lang: string,
  decimals = 3
): string => {
  const number = formatNumber(value, lang, decimals);
  return number ? `${number} ${symbol}` : '';
};

/**
 * `value` shortened with K, M, … (see `getRoundedAbbreveration`) and its token name: "651.7K HBD",
 * pl "651,7K HBD". The same text at every width.
 */
export const formatAbbreviatedAmount = (
  value: Big,
  symbol: AmountSymbol,
  lang: string,
  maxDecimals = 2
): string => `${getRoundedAbbreveration(value, lang, maxDecimals)} ${symbol}`;

/** `value` US dollars with `decimals` decimals where `lang` puts the sign: "$1,234.56", pl "1234,56 $". */
export const formatDollars = (value: Big | number, lang: string, decimals = 2): string => {
  const amount = toBig(value);
  return amount ? fixedFormat(lang, 'dollars', decimals).format(amount.toNumber()) : '';
};

/** `percent` (12.5 for 12.5%) with `decimals` decimals as `lang` writes a percentage: "12.5%", fr "12,5 %". */
export const formatPercent = (percent: number, lang: string, decimals = 0): string =>
  Number.isFinite(percent) ? fixedFormat(lang, 'percent', decimals).format(percent / 100) : '';

/** The decimal separator `lang` writes numbers with: "." in en, "," in pl. */
export const getDecimalSeparator = (lang: string): string =>
  getFormatOrEnglish(plainNumberFormats, lang)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.';

/** A file size in kilobytes below a megabyte, else megabytes, one decimal: "12.3 kB", fr "12,3 ko". */
export const formatFileSize = (bytes: number, lang: string): string => {
  const kilobytes = bytes / BYTES_PER_KILOBYTE;
  return kilobytes < BYTES_PER_KILOBYTE
    ? getFormatOrEnglish(fileSizeFormats.kilobyte, lang).format(kilobytes)
    : getFormatOrEnglish(fileSizeFormats.megabyte, lang).format(kilobytes / BYTES_PER_KILOBYTE);
};

/**
 * `items` as one phrase the way `lang` lists them: "a, b, and c", pl "a, b i c", ja "a、b、c". A
 * conjunction joins with "and", a disjunction with "or", a unit list as the parts of one quantity
 * ("1.00 HBD, 2.00 HP", pl "1,00 HBD i 2,00 HP").
 */
export const formatList = (
  items: readonly string[],
  lang: string,
  type: keyof typeof listFormats = 'conjunction'
): string => getFormatOrEnglish(listFormats[type], lang).format(items);

// Languages that write the next sentence right after the full stop of the last.
const UNSPACED_SENTENCE_LANGUAGES = new Set(['ja', 'zh']);

const sentenceSeparator = (lang: string): string => {
  try {
    return UNSPACED_SENTENCE_LANGUAGES.has(new Intl.Locale(lang).language) ? '' : ' ';
  } catch (error) {
    if (error instanceof RangeError) return ' ';
    throw error;
  }
};

/**
 * Whole sentences, each translated on its own, one after the other as `lang` writes them: with a
 * space between, none in Japanese and Chinese ("下書きは保存されています。…"). Not for parts of one
 * sentence: those belong in one key with placeholders.
 */
export const joinSentences = (sentences: readonly string[], lang: string): string =>
  sentences.join(sentenceSeparator(lang));
