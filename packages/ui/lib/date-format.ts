import { createLocaleFormatCache, getFormatOrEnglish, type LocaleFormatCache } from './locale-format-cache';
import { parseUtcTimestamp } from './time-ago';

// The full month name: with a day, a locale writes it in its date form (Polish "15 maja"), which the
// abbreviation does not always give ("15 maj").
const DATE_TIME_FORMATS = {
  /** "May 15, 2024", "15 maja 2024" */
  date: { day: 'numeric', month: 'long', year: 'numeric' },
  /** "May 15, 2024", "15 maj 2024" */
  mediumDate: { day: 'numeric', month: 'short', year: 'numeric' },
  /** "May 15, 2024, 9:46 AM", "15 maj 2024, 09:46" */
  mediumDateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' },
  /** "May 15", "15 maj" */
  dayMonth: { month: 'short', day: 'numeric' },
  /** "09:46 AM", "09:46" */
  time: { hour: '2-digit', minute: '2-digit' },
  /** "Monday", "poniedziałek" */
  weekday: { weekday: 'long' },
  /** "Mon, May 15", "pon., 15 maja" */
  weekdayDate: { weekday: 'short', day: 'numeric', month: 'long' },
  /** "Mon, May 15, 2024", "pon., 15 maja 2024" */
  weekdayDateYear: { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
  /** "5/15/2024, 9:46:12 AM", "15.05.2024, 09:46:12": the fields `Date.prototype.toLocaleString` prints */
  dateTime: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateTimeFormatName = keyof typeof DATE_TIME_FORMATS;

/** The time zone a date is shown in: the runtime's own, or UTC for a chain date rendered on the server and hydrated. */
export type DateTimeZone = 'local' | 'UTC';

const caches = new Map<string, LocaleFormatCache<Intl.DateTimeFormat>>();

const getFormat = (lang: string, name: DateTimeFormatName, zone: DateTimeZone): Intl.DateTimeFormat => {
  const key = `${name}|${zone}`;
  let cache = caches.get(key);
  if (!cache) {
    const options: Intl.DateTimeFormatOptions = {
      ...DATE_TIME_FORMATS[name],
      ...(zone === 'UTC' ? { timeZone: 'UTC' } : {})
    };
    // eslint-disable-next-line no-restricted-syntax -- the locale formatting module's own formatter
    cache = createLocaleFormatCache((locale) => new Intl.DateTimeFormat(locale, options));
    caches.set(key, cache);
  }
  return getFormatOrEnglish(cache, lang);
};

/**
 * `date` in `lang` as the named format gives it, in the runtime's time zone or UTC. A string without a
 * zone designator is a chain timestamp, read as UTC. A tag the runtime rejects formats in English; an
 * unparsable date formats as an empty string.
 */
export const formatDateTime = (
  date: string | number | Date,
  lang: string,
  name: DateTimeFormatName,
  zone: DateTimeZone = 'local'
): string => {
  const timestamp = parseUtcTimestamp(date);
  if (isNaN(timestamp)) return '';
  return getFormat(lang, name, zone).format(timestamp);
};
