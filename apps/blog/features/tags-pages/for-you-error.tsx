'use client';

import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';

interface ForYouErrorProps {
  onRetry: () => void;
  isRetrying: boolean;
  /** The recommendation service (haf_fyp) failed, rather than the reads the feed is shown with. */
  serviceFailed: boolean;
}

/** The For You feed's first page could not be read: the list's error state, with a retry. */
const ForYouError = ({ onRetry, isRetrying, serviceFailed }: ForYouErrorProps) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="mx-auto flex flex-col items-center gap-4 py-8 text-center" data-testid="for-you-error">
      <Icons.hive className="h-16 w-16" />
      <h3 className="text-lg">{t('for_you_feed.unavailable')}</h3>
      <p className="text-muted-foreground">
        {serviceFailed ? t('for_you_feed.service_not_responding') : t('for_you_feed.data_not_loaded')}
      </p>
      <Button variant="redHover" disabled={isRetrying} onClick={onRetry} className="w-28">
        {isRetrying ? t('global.loading') : t('user_profile.load_more_retry')}
      </Button>
      <Link href="/trending" className="text-primary hover:underline">
        {t('for_you_feed.go_to_trending')}
      </Link>
    </div>
  );
};

export default ForYouError;
