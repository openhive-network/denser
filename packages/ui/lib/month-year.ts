import { createLocaleFormatCache } from './locale-format-cache';
import { parseUtcTimestamp } from './time-ago';

const FALLBACK_LOCALE = 'en';

// UTC keeps the server-rendered month equal to the one the browser hydrates, whatever either's time zone.
const MONTH_YEAR_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  timeZone: 'UTC'
};

const monthYearFormats = createLocaleFormatCache(
  (lang) => new Intl.DateTimeFormat(lang, MONTH_YEAR_FORMAT_OPTIONS)
);

/** Number of formatters this module's cache holds. */
export const getMonthYearFormatCacheSize = (): number => monthYearFormats.size();

const getMonthYearFormat = (lang: string): Intl.DateTimeFormat => {
  try {
    return monthYearFormats.get(lang);
  } catch (error) {
    if (error instanceof RangeError) return monthYearFormats.get(FALLBACK_LOCALE);
    throw error;
  }
};

/**
 * Month and year of a chain timestamp (UTC, with or without a zone suffix) in `lang`'s own order and
 * month form: "July 2020" in English, "2020년 7월" in Korean, "lipiec 2020" in Polish. A tag the
 * runtime rejects formats in English.
 */
export const formatMonthYear = (date: string, lang: string): string =>
  getMonthYearFormat(lang).format(parseUtcTimestamp(date));
