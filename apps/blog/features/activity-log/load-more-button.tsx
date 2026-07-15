import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
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
        <Icons.spinner className="h-[18px] w-[18px] animate-spin text-red-600" />
      ) : (
        t('cards.comment_card.load_more')
      )}
    </Button>
  );
}
