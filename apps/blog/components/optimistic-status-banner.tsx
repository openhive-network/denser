'use client';

import { useEffect, useState } from 'react';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from '@/blog/i18n/client';

/**
 * Time-aware banner shown for optimistic (unindexed) posts.
 * Updates messaging based on elapsed time since the post was created.
 *
 * - 0-10s: "Publishing..."
 * - 10-30s: "Confirmed on blockchain. Waiting for indexing..."
 * - 30s+: "Indexing is taking longer than usual..."
 */
export default function OptimisticStatusBanner({ createdAt }: { createdAt: string }) {
  const { t } = useTranslation('common_blog');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime();
    const update = () => setElapsedSeconds(Math.floor((Date.now() - createdTime) / 1000));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [createdAt]);

  let message: string;
  if (elapsedSeconds < 10) {
    message = t('global.publishing');
  } else if (elapsedSeconds < 30) {
    message = t('global.confirmed_indexing');
  } else {
    message = t('global.indexing_slow');
  }

  return (
    <div className="my-2 flex items-center gap-2 rounded-md border border-blue-400/50 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
      <CircleSpinner size={14} color="#3b82f6" loading />
      <span>{message}</span>
    </div>
  );
}
