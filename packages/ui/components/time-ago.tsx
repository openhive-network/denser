import { getMinuteClockNow, getTimeAgoString, getTimeAgoTitle, subscribeMinuteClock } from '@ui/lib/time-ago';
import { FC, useSyncExternalStore } from 'react';
import { useLocale } from './locale-context';

interface TimeAgoProps {
  date: string | number | Date;
  /** Optional language code. Falls back to the locale of the nearest `LocaleProvider` */
  lang?: string;
}

const isServer = typeof window === 'undefined';

// The server renders with its own clock and timezone. A client hydration render gets `null` so the
// next client render always differs from it, and React then replaces the server text and title
// that hydration kept (mismatch suppressed).
const getServerClockNow = (): number | null => (isServer ? Date.now() : null);

const TimeAgo: FC<TimeAgoProps> = ({ date, lang }) => {
  const { locale } = useLocale();
  const userLang = lang || locale;
  const now = useSyncExternalStore(subscribeMinuteClock, getMinuteClockNow, getServerClockNow);

  const isHydrating = now === null;

  return (
    <span title={isHydrating ? undefined : getTimeAgoTitle(date, userLang)} suppressHydrationWarning>
      {isHydrating ? '' : getTimeAgoString(date, userLang, now)}
    </span>
  );
};

export default TimeAgo;
