import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { FC } from 'react';

interface PostCardCommentTooltipProps {
  children: number;
  url: string;
}

const PostCardCommentTooltip: FC<PostCardCommentTooltipProps> = ({ children, url }) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex items-center" data-testid="post-children">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="flex items-center">
            <>
              <Link href={url} className="flex cursor-pointer items-center">
                {children > 1 ? (
                  <Icons.messagesSquare className="h-4 w-4 sm:mr-1" />
                ) : (
                  <Icons.comment className="h-4 w-4 sm:mr-1" />
                )}
              </Link>
              <Link
                // href={`/${category}/@${author}/${permlink}/#comments`}
                href={url}
                className="flex cursor-pointer items-center pl-1 hover:text-destructive"
                data-testid="post-card-response-link"
              >
                {children}
              </Link>
            </>
          </TooltipTrigger>
          <TooltipContent data-testid="post-card-responses">
            <p>
              {`${
                children === 0
                  ? t('cards.post_card.no_responses')
                  : children === 1
                    ? t('cards.post_card.response')
                    : t('cards.post_card.responses', { responses: children })
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
