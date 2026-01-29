import { Button } from '@ui/components/button';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from '@/blog/i18n/client';

interface LoadMoreButtonProps {
  isFetching: boolean;
  onClick: () => void;
}

export function LoadMoreButton({ isFetching, onClick }: LoadMoreButtonProps) {
  const { t } = useTranslation('common_blog');

  return (
    <Button
      variant="outline"
      className="mb-8 mt-4 border-destructive text-base text-destructive hover:bg-destructive hover:text-secondary dark:border-destructive"
      onClick={onClick}
      disabled={isFetching}
    >
      {isFetching ? (
        <CircleSpinner loading={isFetching} size={18} color="#dc2626" />
      ) : (
        t('cards.comment_card.load_more')
      )}
    </Button>
  );
}
