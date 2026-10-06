import { getCookie } from '@ui/lib/utils';
import { FC, useEffect, useState } from 'react';

interface TimeAgoProps {
  date: string | number | Date;
  /** Optional language code. Falls back to NEXT_LOCALE cookie or 'en' */
  lang?: string;
}

// Move intervals outside the function to avoid recreation
const TIME_INTERVALS: [number, Intl.RelativeTimeFormatUnit][] = [
  [31536000, 'year'],
  [2592000, 'month'],
  [604800, 'week'],
  [86400, 'day'],
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second']
];

// Intl formatters are costly to construct and lists render hundreds of TimeAgo: share them.
const UTC_NOW_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});
const relativeTimeFormats = new Map<string, Intl.RelativeTimeFormat>();

const getRelativeTimeFormat = (lang: string): Intl.RelativeTimeFormat => {
  let rtf = relativeTimeFormats.get(lang);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    relativeTimeFormats.set(lang, rtf);
  }
  return rtf;
};

const getTimeAgoString = (date: Date, lang: string = 'en'): string => {
  try {
    const now = UTC_NOW_FORMAT.format(new Date());
    const timestamp = new Date(date).getTime();
    const diff = Math.floor((new Date(now).getTime() - timestamp) / 1000);

    if (isNaN(diff)) {
      return 'Invalid date';
    }

    const rtf = getRelativeTimeFormat(lang);

    for (const [secondsInUnit, unit] of TIME_INTERVALS) {
      const value = Math.floor(diff / secondsInUnit);
      if (value > 0) {
        return rtf.format(-value, unit);
      }
    }

    return rtf.format(0, 'second');
  } catch (error) {
    return 'Invalid date';
  }
};

const TimeAgo: FC<TimeAgoProps> = ({ date, lang }) => {
  // Use provided lang prop, fall back to cookie or 'en'
  const userLang = lang || getCookie('NEXT_LOCALE') || 'en';
  // Computed during render so the server HTML already holds the text and the line keeps its final width
  const [timeAgo, setTimeAgo] = useState<string>(() => getTimeAgoString(new Date(date), userLang));
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgoString(new Date(date), userLang));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date, userLang]);

  // The server renders with its own clock, timezone and no locale cookie. Hydration keeps that text
  // (mismatch suppressed), so the span is re-created once mounted to show the client's values.
  return (
    <span
      key={isMounted ? 'client' : 'server'}
      title={new Date(date).toLocaleString(userLang)}
      suppressHydrationWarning
    >
      {timeAgo}
    </span>
  );
};

export default TimeAgo;
