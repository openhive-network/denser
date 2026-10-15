import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';

interface PostCardUpvotesTooltipProps {
  blacklistCheck: boolean;
  blacklists?: string[];
}

const PostCardBlacklistMark = ({ blacklistCheck, blacklists }: PostCardUpvotesTooltipProps) => {
  const { t } = useTranslation('common_blog');
  return blacklists && blacklists[0] ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="text-destructive">({blacklists.length})</span>
        </TooltipTrigger>
        <TooltipContent>{blacklists[0]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : blacklistCheck ? (
    <span className="text-destructive" title={t('cards.my_blacklist')}>
      (1)
    </span>
  ) : null;
};

export default PostCardBlacklistMark;
