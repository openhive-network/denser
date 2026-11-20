import { createLocaleFormatCache } from './locale-format-cache';

/** The units a time span is counted in, largest first. */
export type TimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';

const TIME_INTERVALS: [number, TimeUnit][] = [
  [31536000, 'year'],
  [2592000, 'month'],
  [604800, 'week'],
  [86400, 'day'],
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second']
];

const MONTHS_PER_YEAR = 12;

const INVALID_TIME_AGO = 'Invalid date';
const INVALID_TITLE = 'Invalid Date';
const CLOCK_TICK_MS = 60000;
// A future date closer than this reads as "now", so a fresh timestamp from a node whose clock runs
// slightly ahead of the browser's is not shown as "in 5 seconds".
const FUTURE_SKEW_TOLERANCE_SECONDS = 60;

// The fields `Date.prototype.toLocaleString(lang)` prints when given no options.
const TITLE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
};

// Hive API timestamps are UTC but carry no zone designator, which `new Date` would read as local time.
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * `long` reads "49 minutes ago"; `narrow` reads "49m ago" for tight spaces: always numeric, so a
 * one-unit difference stays as short as any other ("1mo ago", not "last month"). A locale whose narrow
 * form marks the past only by a minus sign gets its short form ("47 мин. назад", not "-47 мин"), and
 * Polish hours read "5 godz. temu", not CLDR's narrow "5 g. temu".
 */
export type TimeAgoStyle = 'long' | 'narrow';

// Sign characters and bidi marks, which a format without direction words puts around the number.
const SIGN_OR_BIDI = /[\s+\-\u2212\u061c\u200e\u200f]/g;

const literalText = (rtf: Intl.RelativeTimeFormat, value: number): string =>
  rtf
    .formatToParts(value, 'minute')
    .filter((part) => part.type === 'literal')
    .map((part) => part.value.replace(SIGN_OR_BIDI, ''))
    .join('');

// CLDR's narrow pattern for some locales (ru, fr) tells past from future only by the number's sign:
// "-47 мин" / "+5 мин".
const hasDirectionWords = (rtf: Intl.RelativeTimeFormat): boolean =>
  literalText(rtf, -5) !== literalText(rtf, 5);

type RelativeFormat = Pick<Intl.RelativeTimeFormat, 'format' | 'resolvedOptions'>;

// Units whose narrow form reads as an unfamiliar abbreviation, by language, shown in the short form
// instead: CLDR's narrow Polish hour is "g.", where "godz." is the usual abbreviation.
const SHORT_STYLE_UNITS: Record<string, readonly Intl.RelativeTimeFormatUnit[]> = { pl: ['hour'] };

const createNarrowFormat = (lang: string): RelativeFormat => {
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  const narrow = new Intl.RelativeTimeFormat(lang, { style: 'narrow', numeric: 'always' });
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  const short = new Intl.RelativeTimeFormat(lang, { style: 'short', numeric: 'always' });
  if (!hasDirectionWords(narrow)) return short;

  const shortUnits = SHORT_STYLE_UNITS[new Intl.Locale(narrow.resolvedOptions().locale).language];
  if (!shortUnits) return narrow;
  return {
    format: (value, unit) => (shortUnits.includes(unit) ? short : narrow).format(value, unit),
    resolvedOptions: () => narrow.resolvedOptions()
  };
};

const relativeFormats = {
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  long: createLocaleFormatCache((lang) => new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })),
  narrow: createLocaleFormatCache(createNarrowFormat),
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  numeric: createLocaleFormatCache((lang) => new Intl.RelativeTimeFormat(lang, { numeric: 'always' }))
};
const titleFormats = createLocaleFormatCache(
  // eslint-disable-next-line @hive/i18n/no-adhoc-format -- the locale formatting module's own formatter
  (lang) => new Intl.DateTimeFormat(lang, TITLE_FORMAT_OPTIONS)
);

/** Number of formatters each of this module's caches holds. */
export const getTimeAgoFormatCacheSizes = (): {
  relative: number;
  narrow: number;
  numeric: number;
  title: number;
} => ({
  relative: relativeFormats.long.size(),
  narrow: relativeFormats.narrow.size(),
  numeric: relativeFormats.numeric.size(),
  title: titleFormats.size()
});

export const parseUtcTimestamp = (date: string | number | Date): number => {
  if (typeof date === 'string' && ZONELESS_DATE_TIME.test(date)) {
    return Date.parse(`${date}Z`);
  }
  return new Date(date).getTime();
};

/**
 * Relative time of `date` at `now` (epoch ms): "2 hours ago" for a past date, "in 3 days" for a future
 * one ("2h ago", "in 3d" in the narrow style); "Invalid date" for an unparsable date or locale.
 */
export const getTimeAgoString = (
  date: string | number | Date,
  lang: string,
  now: number,
  style: TimeAgoStyle = 'long'
): string => {
  const diff = Math.floor((now - parseUtcTimestamp(date)) / 1000);
  if (isNaN(diff)) {
    return INVALID_TIME_AGO;
  }

  let rtf: RelativeFormat;
  try {
    rtf = relativeFormats[style].get(lang);
  } catch (error) {
    if (error instanceof RangeError) return INVALID_TIME_AGO;
    throw error;
  }

  if (diff < 0) {
    if (-diff >= FUTURE_SKEW_TOLERANCE_SECONDS) {
      return formatFuture(-diff, rtf);
    }
  } else if (diff > 0) {
    const [count, unit] = toLargestUnit(diff);
    return rtf.format(-count, unit);
  }
  // The numeric narrow style would read "in 0s"; every style reads the present as "now".
  return relativeFormats.long.get(lang).format(0, 'second');
};

// The time left is rounded rather than truncated: a wait of 2 days 23 hours reads "in 3 days".
const formatFuture = (secondsLeft: number, rtf: RelativeFormat): string => {
  const [secondsInUnit, unit] =
    TIME_INTERVALS.find(([seconds]) => secondsLeft >= seconds) ?? TIME_INTERVALS[TIME_INTERVALS.length - 1];
  const [count, countUnit] = rollOverMonths(Math.round(secondsLeft / secondsInUnit), unit);
  return rtf.format(count, countUnit);
};

// A month counts 30 days, so 360 to 364 days make 12 of them: those read as a year, as a gap of 365
// days does, and no time reads "12 months".
const rollOverMonths = (value: number, unit: TimeUnit): [number, TimeUnit] =>
  unit === 'month' && value >= MONTHS_PER_YEAR ? [Math.floor(value / MONTHS_PER_YEAR), 'year'] : [value, unit];

/**
 * `seconds` counted in the largest unit it holds at least one whole of, truncated: 90 → 1 minute,
 * 2 days 23 hours → 2 days, 360 days → 1 year. Less than a second is 0 seconds.
 */
export const toLargestUnit = (seconds: number): [number, TimeUnit] => {
  for (const [secondsInUnit, unit] of TIME_INTERVALS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value > 0) return rollOverMonths(value, unit);
  }
  return [0, 'second'];
};

/**
 * `count` `unit`s ago in the long style, always numeric and with the locale's plural form: "2 years
 * ago", "2 lata temu", "5 lat temu". Throws `RangeError` for a locale the runtime rejects.
 */
export const getUnitsAgoString = (count: number, unit: Intl.RelativeTimeFormatUnit, lang: string): string =>
  relativeFormats.numeric.get(lang).format(-count, unit);

/**
 * `value` `unit`s from now in the long style, named where the locale has a word for it: -1 day is
 * "yesterday", 0 days "today", 2 days "in 2 days". Throws `RangeError` for a locale the runtime rejects.
 */
export const getRelativeUnitString = (value: number, unit: Intl.RelativeTimeFormatUnit, lang: string): string =>
  relativeFormats.long.get(lang).format(value, unit);

/**
 * `date` in the runtime's local timezone, as `Date.prototype.toLocaleString(lang)` prints it;
 * "Invalid Date" for an unparsable date or locale.
 */
export const getTimeAgoTitle = (date: string | number | Date, lang: string): string => {
  const timestamp = parseUtcTimestamp(date);
  if (isNaN(timestamp)) {
    return INVALID_TITLE;
  }
  try {
    return titleFormats.get(lang).format(timestamp);
  } catch (error) {
    if (error instanceof RangeError) return INVALID_TITLE;
    throw error;
  }
};

/** `date` as an ISO 8601 UTC string for a `<time dateTime>` attribute; `undefined` for an unparsable date. */
export const getTimeAgoDateTime = (date: string | number | Date): string | undefined => {
  const timestamp = parseUtcTimestamp(date);
  return isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
};

type ClockListener = () => void;

const clockListeners = new Set<ClockListener>();
let clockInterval: ReturnType<typeof setInterval> | undefined;
let clockNow = Date.now();

const tickClock = () => {
  clockNow = Date.now();
  clockListeners.forEach((listener) => listener());
};

/**
 * Subscribes to a clock shared by every subscriber: one interval ticks each minute while anyone
 * listens. Returns the unsubscribe function. Shaped for `useSyncExternalStore`.
 */
export const subscribeMinuteClock = (listener: ClockListener): (() => void) => {
  if (clockListeners.size === 0) {
    clockNow = Date.now();
    clockInterval = setInterval(tickClock, CLOCK_TICK_MS);
  }
  clockListeners.add(listener);

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval !== undefined) {
      clearInterval(clockInterval);
      clockInterval = undefined;
    }
  };
};

/** Epoch ms of the shared clock's last tick, or of its first subscription. */
export const getMinuteClockNow = (): number => clockNow;
