'use client';

import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';
import { Link } from '@hive/ui';

interface PostCardCommentTooltipProps {
  comments: number;
  url: string;
}

const PostCardCommentTooltip = ({ comments, url }: PostCardCommentTooltipProps) => {
  const { t } = useTranslation('common_blog');
  const responsesText =
    comments === 0
      ? t('cards.post_card.no_responses')
      : comments === 1
        ? t('cards.post_card.response')
        : t('cards.post_card.responses', { responses: comments });
  return (
    <div className="flex items-center" data-testid="post-children">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={url}
              aria-label={responsesText}
              className="-m-1 flex cursor-pointer items-center p-1 hover:text-destructive"
              data-testid="post-card-response-link"
            >
              {comments > 1 ? (
                <Icons.messagesSquare className="h-4 w-4 sm:mr-2" />
              ) : (
                <Icons.comment className="h-4 w-4 sm:mr-2" />
              )}
              {comments}
            </Link>
          </TooltipTrigger>
          <TooltipContent data-testid="post-card-responses">
            <p>
              {responsesText}
              {t('cards.post_card.click_to_respond')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
export default PostCardCommentTooltip;
