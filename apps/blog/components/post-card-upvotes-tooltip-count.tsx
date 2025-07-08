import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from 'next-i18next';

const PostCardUpvotesTooltipCount = ({ votes }: { votes: number }) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className="flex items-center font-light text-secondary"
            data-testid="post-total-votes"
          >
            {votes}
          </TooltipTrigger>
          <TooltipContent data-testid="post-card-votes-tooltip">
            <p>
              {votes === 0
                ? t('cards.post_card.no_votes')
                : votes > 1
                  ? t('cards.post_card.votes', { votes: votes })
                  : t('cards.post_card.vote')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default PostCardUpvotesTooltipCount;
