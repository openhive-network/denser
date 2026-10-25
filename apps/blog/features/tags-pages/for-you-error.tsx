'use client';

import { Button } from '@ui/components/button';
import NoDataError from '@/blog/components/no-data-error';
import { useTranslation } from '@/blog/i18n/client';

/** The For You feed's first page could not be read: the list's error state, with a retry. */
const ForYouError = ({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex flex-col items-center" data-testid="for-you-error">
      <NoDataError />
      <Button variant="redHover" disabled={isRetrying} onClick={onRetry} className="w-28">
        {isRetrying ? t('global.loading') : t('user_profile.load_more_retry')}
      </Button>
    </div>
  );
};

export default ForYouError;
