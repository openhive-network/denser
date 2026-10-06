const TIME_INTERVALS: [number, Intl.RelativeTimeFormatUnit][] = [
  [31536000, 'year'],
  [2592000, 'month'],
  [604800, 'week'],
  [86400, 'day'],
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second']
];

const INVALID_TIME_AGO = 'Invalid date';
const INVALID_TITLE = 'Invalid Date';
const CLOCK_TICK_MS = 60000;

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

const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();
const titleFormats = new Map<string, Intl.DateTimeFormat>();

const getRelativeFormat = (lang: string): Intl.RelativeTimeFormat => {
  let format = relativeFormats.get(lang);
  if (!format) {
    format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    relativeFormats.set(lang, format);
  }
  return format;
};

const getTitleFormat = (lang: string): Intl.DateTimeFormat => {
  let format = titleFormats.get(lang);
  if (!format) {
    format = new Intl.DateTimeFormat(lang, TITLE_FORMAT_OPTIONS);
    titleFormats.set(lang, format);
  }
  return format;
};

const parseUtcTimestamp = (date: string | number | Date): number => {
  if (typeof date === 'string' && ZONELESS_DATE_TIME.test(date)) {
    return Date.parse(`${date}Z`);
  }
  return new Date(date).getTime();
};

/** Relative age of `date` at `now` (epoch ms), e.g. "2 hours ago"; "Invalid date" for an unparsable date or locale. */
export const getTimeAgoString = (date: string | number | Date, lang: string, now: number): string => {
  const diff = Math.floor((now - parseUtcTimestamp(date)) / 1000);
  if (isNaN(diff)) {
    return INVALID_TIME_AGO;
  }

  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = getRelativeFormat(lang);
  } catch (error) {
    if (error instanceof RangeError) return INVALID_TIME_AGO;
    throw error;
  }

  for (const [secondsInUnit, unit] of TIME_INTERVALS) {
    const value = Math.floor(diff / secondsInUnit);
    if (value > 0) {
      return rtf.format(-value, unit);
    }
  }
  return rtf.format(0, 'second');
};

/** The same text as `new Date(date).toLocaleString(lang)`, from a formatter shared per locale. */
export const getTimeAgoTitle = (date: string | number | Date, lang: string): string => {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return INVALID_TITLE;
  }
  return getTitleFormat(lang).format(parsed);
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
