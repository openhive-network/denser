import { parseUtcTimestamp } from './time-ago';

// UTC keeps the server-rendered month equal to the one the browser hydrates, whatever either's time zone.
const MONTH_YEAR_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  timeZone: 'UTC'
};

const monthYearFormats = new Map<string, Intl.DateTimeFormat>();

const getMonthYearFormat = (lang: string): Intl.DateTimeFormat => {
  let format = monthYearFormats.get(lang);
  if (!format) {
    format = new Intl.DateTimeFormat(lang, MONTH_YEAR_FORMAT_OPTIONS);
    monthYearFormats.set(lang, format);
  }
  return format;
};

/**
 * Month and year of a chain timestamp (UTC, with or without a zone suffix) in `lang`'s own order and
 * month form: "July 2020" in English, "2020년 7월" in Korean, "lipiec 2020" in Polish.
 */
export const formatMonthYear = (date: string, lang: string): string =>
  getMonthYearFormat(lang).format(parseUtcTimestamp(date));
