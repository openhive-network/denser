import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

interface PostCardUpvotesTooltipProps {
  blacklistCheck: boolean;
  blacklists?: string[];
}

const PostCardBlacklistMark = ({ blacklistCheck, blacklists }: PostCardUpvotesTooltipProps) => {
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
    <span className="text-destructive" title="My blacklist">
      (1)
    </span>
  ) : null;
};

export default PostCardBlacklistMark;
