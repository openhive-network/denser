import { getCookie } from '@ui/lib/utils';
import { FC, useEffect, useState } from 'react';
import { IAccountNotificationEx } from '@transaction/lib/bridge';

interface TimeAgoProps {
  date: string | number | Date;
}

const getTimeAgoString = (date: Date, lang: string = 'en'): string => {
  try {
    const now = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    const timestamp = new Date(date).getTime();
    const diff = Math.floor((new Date(now).getTime() - timestamp) / 1000);

    if (isNaN(diff)) {
      return 'Invalid date';
    }

    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

    const intervals: [number, Intl.RelativeTimeFormatUnit][] = [
      [31536000, 'year'],
      [2592000, 'month'],
      [604800, 'week'],
      [86400, 'day'],
      [3600, 'hour'],
      [60, 'minute'],
      [1, 'second']
    ];

    for (const [secondsInUnit, unit] of intervals) {
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

const TimeAgo: FC<TimeAgoProps> = ({ date }) => {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const userLang = getCookie('NEXT_LOCALE') || 'en';

  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgoString(new Date(date), userLang));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date, userLang]);

  return <span className="text-xs text-gray-400">{timeAgo}</span>;
};

export default TimeAgo;
