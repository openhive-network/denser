import { formatDateTime, getRelativeUnitString } from '@ui/lib/locale-format';

/** Days back a day is named by its weekday alone: further back, a weekday repeats */
const WEEKDAY_ONLY_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (timestamp: number) => new Date(timestamp).setHours(0, 0, 0, 0);

/** Whether `a` and `b` fall on the same day of the browser's time zone */
export const isSameDay = (a: number, b: number): boolean => startOfDay(a) === startOfDay(b);

/** A message's hour and minute the way `lang` writes them: "09:46 AM" in English, "09:46" in Polish */
export const formatMessageTime = (timestamp: number, lang: string): string =>
  formatDateTime(timestamp, lang, 'time');

/**
 * The day of `timestamp` as a heading in `lang`, seen at `now`: "Today", "Yesterday", the weekday
 * within the past week, else the date (with its year when that is not the current one).
 */
export function formatDayHeading(timestamp: number, now: number, lang: string): string {
  // Rounded: a day with a daylight saving change is an hour longer or shorter
  const daysAgo = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
  if (daysAgo === 0 || daysAgo === 1) {
    const text = getRelativeUnitString(-daysAgo, 'day', lang);
    return text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
  }
  if (daysAgo > 1 && daysAgo <= WEEKDAY_ONLY_DAYS) return formatDateTime(timestamp, lang, 'weekday');
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return formatDateTime(timestamp, lang, sameYear ? 'weekdayDate' : 'weekdayDateYear');
}
