const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const WEEKDAY_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long' };
// The full month name: with a day, a locale writes it in its date form (Polish "15 maja"), which the
// abbreviation does not always give ("15 maj")
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long' };
const DATE_WITH_YEAR_OPTIONS: Intl.DateTimeFormatOptions = { ...DATE_OPTIONS, year: 'numeric' };
/** Days back a day is named by its weekday alone: further back, a weekday repeats */
const WEEKDAY_ONLY_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

const formats = new Map<string, Intl.DateTimeFormat>();
const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();

function dateFormat(lang: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}|${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(lang, options);
    formats.set(key, format);
  }
  return format;
}

function relativeFormat(lang: string): Intl.RelativeTimeFormat {
  let format = relativeFormats.get(lang);
  if (!format) {
    format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    relativeFormats.set(lang, format);
  }
  return format;
}

const startOfDay = (timestamp: number) => new Date(timestamp).setHours(0, 0, 0, 0);

/** Whether `a` and `b` fall on the same day of the browser's time zone */
export const isSameDay = (a: number, b: number): boolean => startOfDay(a) === startOfDay(b);

/** A message's hour and minute the way `lang` writes them: "09:46 AM" in English, "09:46" in Polish */
export const formatMessageTime = (timestamp: number, lang: string): string =>
  dateFormat(lang, TIME_OPTIONS).format(timestamp);

/**
 * The day of `timestamp` as a heading in `lang`, seen at `now`: "Today", "Yesterday", the weekday
 * within the past week, else the date (with its year when that is not the current one).
 */
export function formatDayHeading(timestamp: number, now: number, lang: string): string {
  // Rounded: a day with a daylight saving change is an hour longer or shorter
  const daysAgo = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
  if (daysAgo === 0 || daysAgo === 1) {
    const text = relativeFormat(lang).format(-daysAgo, 'day');
    return text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
  }
  if (daysAgo > 1 && daysAgo <= WEEKDAY_ONLY_DAYS) return dateFormat(lang, WEEKDAY_OPTIONS).format(timestamp);
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return dateFormat(lang, sameYear ? DATE_OPTIONS : DATE_WITH_YEAR_OPTIONS).format(timestamp);
}
