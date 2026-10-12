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
              aria-label={`${responsesText}${t('cards.post_card.open_comments')}`}
              className="flex cursor-pointer items-center hover:text-destructive"
              data-testid="post-card-response-link"
            >
              {comments > 1 ? (
                <Icons.messagesSquare className="h-4 w-4 sm:mr-1" aria-hidden="true" />
              ) : (
                <Icons.comment className="h-4 w-4 sm:mr-1" aria-hidden="true" />
              )}
              <span className="pl-1">{comments}</span>
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
