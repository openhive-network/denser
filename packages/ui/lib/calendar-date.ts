import { createLocaleFormatCache } from './locale-format-cache';
import { parseUtcTimestamp } from './time-ago';

const FALLBACK_LOCALE = 'en';

// UTC keeps the server-rendered day equal to the one the browser hydrates, whatever either's time zone;
// two-digit fields keep Node's and the browser's ICU from padding them differently ("9.10" against "09.10").
const CALENDAR_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC'
};

const calendarDateFormats = createLocaleFormatCache(
  (lang) => new Intl.DateTimeFormat(lang, CALENDAR_DATE_FORMAT_OPTIONS)
);

const getCalendarDateFormat = (lang: string): Intl.DateTimeFormat => {
  try {
    return calendarDateFormats.get(lang);
  } catch (error) {
    if (error instanceof RangeError) return calendarDateFormats.get(FALLBACK_LOCALE);
    throw error;
  }
};

/**
 * Numeric calendar date of a chain timestamp (UTC, with or without a zone suffix) in `lang`'s own
 * order and separators: "03/23/2021" in English, "23.03.2021" in Polish. A tag the runtime rejects
 * formats in English.
 */
export const formatCalendarDate = (date: string, lang: string): string =>
  getCalendarDateFormat(lang).format(parseUtcTimestamp(date));
