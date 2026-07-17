import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';

const PostCardUpvotesTooltip = ({ votes }: { votes: number }) => {
  const { t } = useTranslation('common_blog');
  const votesText =
    votes === 0 ? t('cards.post_card.no_votes') : votes > 1 ? t('cards.post_card.votes', { votes: votes }) : t('cards.post_card.vote');
  return (
    <div className="flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="-m-1 flex cursor-default items-center p-1"
              aria-label={votesText}
              data-testid="post-total-votes"
            >
              <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
              {votes}
            </div>
          </TooltipTrigger>
          <TooltipContent data-testid="post-card-votes-tooltip">
            <p>{votesText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default PostCardUpvotesTooltip;
