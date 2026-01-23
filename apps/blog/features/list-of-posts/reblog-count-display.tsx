import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';

/**
 * Static reblog count display for list pages.
 *
 * Shows the number of reblogs for a post without making any API calls.
 * This component is NOT interactive - use ReblogTrigger for individual post pages.
 *
 * @param reblogCount - Number of reblogs (from post.reblogs field returned by bridge API)
 * @param dataTestid - Optional test ID for the component
 */
export const ReblogCountDisplay = ({
  reblogCount,
  dataTestid = 'post-card-reblog-count'
}: {
  reblogCount: number;
  dataTestid?: string;
}) => {
  const { t } = useTranslation('common_blog');

  // Determine tooltip text based on count
  const getTooltipText = () => {
    if (reblogCount === 0) {
      return t('cards.post_card.no_reblogs');
    }
    if (reblogCount === 1) {
      return t('cards.post_card.reblog_count_one');
    }
    return t('cards.post_card.reblog_count', { count: reblogCount });
  };

  return (
    <div className="flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="flex items-center" data-testid={dataTestid}>
            <Icons.forward className="h-4 w-4 sm:mr-1" />
            {reblogCount}
          </TooltipTrigger>
          <TooltipContent data-testid={`${dataTestid}-tooltip`}>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
