import {
  getMinuteClockNow,
  getTimeAgoDateTime,
  getTimeAgoString,
  getTimeAgoTitle,
  subscribeMinuteClock
} from '@ui/lib/time-ago';
import { FC, useSyncExternalStore } from 'react';
import { useLocale } from './locale-context';
import { useSharedTranslation } from '@ui/lib/i18n-client';

interface TimeAgoProps {
  date: string | number | Date;
  /**
   * Optional language code. Falls back to the language the page's texts are shown in: on the server
   * the locale of the nearest `LocaleProvider`, in the browser i18next's, which follows a language
   * switched in another tab
   */
  lang?: string;
}

const isServer = typeof window === 'undefined';

// The server renders with its own clock and timezone. A client hydration render gets `null` so the
// next client render always differs from it, and React then replaces the server text and title
// that hydration kept (mismatch suppressed).
const getServerClockNow = (): number | null => (isServer ? Date.now() : null);

const TimeAgo: FC<TimeAgoProps> = ({ date, lang }) => {
  const { locale } = useLocale();
  // Re-renders on a language change; the server's i18next instance is shared by every request
  const { i18n } = useSharedTranslation(undefined, { useSuspense: false });
  const textLang = isServer ? locale : i18n?.resolvedLanguage || locale;
  const userLang = lang || textLang;
  const now = useSyncExternalStore(subscribeMinuteClock, getMinuteClockNow, getServerClockNow);

  const isHydrating = now === null;

  return (
    <span title={isHydrating ? undefined : getTimeAgoTitle(date, userLang)} suppressHydrationWarning>
      <time dateTime={getTimeAgoDateTime(date)} suppressHydrationWarning>
        {isHydrating ? '' : getTimeAgoString(date, userLang, now)}
      </time>
    </span>
  );
};

export default TimeAgo;
