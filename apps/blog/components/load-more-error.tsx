'use client';

import { FC } from 'react';
import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { Activity } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';

type LoadMoreErrorProps = {
  onRetry: () => void;
  isRetrying?: boolean;
};

/**
 * Inline error shown at the bottom of an infinite feed when a later page
 * fails but earlier pages are still available. Prefer this over replacing
 * the whole list with <NoDataError />.
 */
const LoadMoreError: FC<LoadMoreErrorProps> = ({ onRetry, isRetrying = false }) => {
  const { t } = useTranslation('common_blog');

  return (
    <div
      className="mt-4 flex flex-col items-center gap-2 border-2 border-solid border-destructive/40 bg-card-noContent px-4 py-3 text-sm md:flex-row md:justify-between"
      data-testid="load-more-error"
      role="status"
    >
      <span>{t('user_profile.load_more_failed')}</span>
      <div className="flex items-center gap-3">
        <Button variant="redHover" disabled={isRetrying} onClick={onRetry} className="w-28">
          {isRetrying ? t('global.loading') : t('user_profile.load_more_retry')}
        </Button>
        <Link href="/healthchecker" className="inline-flex items-center text-primary hover:underline">
          <Activity className="mr-2 h-4 w-4" />
          {t('user_profile.check_node_status')}
        </Link>
      </div>
    </div>
  );
};

export default LoadMoreError;
