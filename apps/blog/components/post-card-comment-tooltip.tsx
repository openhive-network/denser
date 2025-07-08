import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { FC } from 'react';
import { MessageCircle } from 'lucide-react';

interface PostCardCommentTooltipProps {
  comments: number;
  url: string;
}

const PostCardCommentTooltip = ({ comments, url }: PostCardCommentTooltipProps) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex items-center" data-testid="post-children">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="flex items-center">
            <>
              <Link href={url} className="flex cursor-pointer items-center">
                <MessageCircle className="h-[18px] w-[18px] sm:mr-0.5" />
              </Link>
              <Link
                // href={`/${category}/@${author}/${permlink}/#comments`}
                href={url}
                className="flex cursor-pointer items-center pl-1 font-light"
                data-testid="post-card-response-link"
              >
                {comments}
              </Link>
            </>
          </TooltipTrigger>
          <TooltipContent data-testid="post-card-responses">
            <p>
              {`${
                comments === 0
                  ? t('cards.post_card.no_responses')
                  : comments === 1
                    ? t('cards.post_card.response')
                    : t('cards.post_card.responses', { responses: comments })
              }`}
              {t('cards.post_card.click_to_respond')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
export default PostCardCommentTooltip;
