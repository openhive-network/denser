import { Button } from '@hive/ui/components/button';
import { useTranslation } from 'next-i18next';

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
      {t('user_profil.lists.list.previous_button')}
      </Button>
      <Button variant="outlineRed" disabled={!hasNextPage || isLoading} onClick={onNextPage}>
      {t('user_profil.lists.list.next_button')}
      </Button>{' '}
    </div>
  );
}
