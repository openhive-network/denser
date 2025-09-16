'use client';

import { useTranslation } from '@/blog/i18n/client';
import { Button } from '@ui/components/button';

export default function PrevNextButtons({
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  isLoading
}: {
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
}) {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex justify-between">
      <Button variant="outlineRed" disabled={!hasPrevPage} onClick={onPrevPage}>
        {t('user_profile.lists.list.previous_button')}
      </Button>
      <Button variant="outlineRed" disabled={!hasNextPage || isLoading} onClick={onNextPage}>
        {t('user_profile.lists.list.next_button')}
      </Button>{' '}
    </div>
  );
}
