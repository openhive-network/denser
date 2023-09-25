import { Icons } from '@hive/ui/components/icons';
import { dateToRelative } from '@hive/ui/lib/parse-date';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@hive/ui/components/card';
import { cn, getPostSummary } from '@/blog/lib/utils';
import Link from 'next/link';
import { Separator } from '@hive/ui/components/separator';
import accountReputation from '@/blog/lib/account-reputation';
import { Badge } from '@hive/ui/components/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import DialogLogin from '@/blog/components/dialog-login';
import { Entry } from '@/blog/lib/bridge';
import DetailsCardHover from './details-card-hover';
import clsx from 'clsx';
import PostImage from './post-img';

const RepliesListItem = ({ comment }: { comment: Entry }) => {
  console.log(comment)
  return (
    <>
      <li className={clsx({'opacity-60 hover:opacity-100': comment.stats?.gray})} data-testid="comment-list-item">
        <Card
          className={cn(
            'mt-4 px-2 hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
          )}
        >
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Link href={`/@${comment.author}`} data-testid="comment-author-avatar-link">
                <img
                  className="mr-3 h-[24px] w-[24px] rounded-3xl"
                  height="24"
                  width="24"
                  src={`https://images.hive.blog/u/${comment.author}/avatar/small`}
                  alt={`${comment.author} profile picture`}
                  loading="lazy"
                  data-testid="comment-author-avatar"
                />
              </Link>
              <div className="flex items-center">
                <Link
                  href={`/@${comment.author}`}
                  className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white dark:hover:text-red-600"
                  data-testid="post-author"
                >
                  {comment.author}
                </Link>{' '}
                ({accountReputation(comment.author_reputation)})
                {comment.blacklists && comment.blacklists[0] ? (
                  <span className="text-red-600" title={comment.blacklists[0]}>
                    ({comment.blacklists.length})
                  </span>
                ) : null}
                {comment.author_title ? (
                  <Badge variant="outline" className="ml-1 border-red-600 text-slate-500">
                    {comment.author_title}
                  </Badge>
                ) : null}
                <span className="flex items-center gap-2">
                  {comment.percent_hbd === 0 ? <Icons.hive className="h-4 w-4" /> : null}
                </span>
                <span className="text-xs md:text-sm">
                  &nbsp;in{` `}
                  {comment.community ? (
                    <Link
                      href={`/trending/${comment.community}`}
                      className="hover:cursor-pointer hover:text-red-600"
                      data-testid="comment-community-category-link"
                    >
                      {comment.community_title}
                    </Link>
                  ) : (
                    <Link
                      href={`/trending/${comment.category}`}
                      className="hover:cursor-pointer hover:text-red-600"
                      data-testid="comment-community-category-link"
                    >
                      #{comment.category}
                    </Link>
                  )}
                  <span className="mx-1">•</span>
                  <Link href={`/${comment.category}/@${comment.author}/${comment.permlink}`} className="hover:cursor-pointer hover:text-red-600" data-testid="comment-timestamp">
                    {dateToRelative(comment.created)} ago
                  </Link>
                </span>
              </div>
            </div>
          </CardHeader>
          <div  className="flex flex-col md:flex-row">
          <PostImage post={comment}/>
          <CardContent>
            <CardTitle data-testid="comment-card-title">
              <Link  href={`/${comment.category}/@${comment.author}/${comment.permlink}`} >
                {comment.title}
                </Link>
              </CardTitle>
            <CardDescription className="w-full" data-testid="comment-card-description">
              <Link href={`/${comment.category}/@${comment.author}/${comment.permlink}`}>
                {getPostSummary(comment.json_metadata, comment.body)}
                </Link>
            </CardDescription>
          </CardContent></div>
          <CardFooter>
            <div className="flex h-5 items-center space-x-4 text-sm" data-testid="comment-card-footer">
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger data-testid="comment-card-upvote-button">
                      <DialogLogin>
                        <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                      </DialogLogin>
                    </TooltipTrigger>
                    <TooltipContent data-testid="comment-card-upvote-tooltip">Upvote</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger data-testid="comment-card-downvote-button">
                      <DialogLogin>
                        <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                      </DialogLogin>
                    </TooltipTrigger>
                    <TooltipContent data-testid="comment-card-downvote-tooltip">Downvote</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DetailsCardHover
                  post={comment}
                  decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
              >
              <div  data-testid="post-payout" className={`flex items-center hover:cursor-pointer hover:text-red-600 ${
                      Number(comment.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
                    }`}>${comment.payout.toFixed(2)}</div>
              </DetailsCardHover>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center" data-testid="comment-vote">
                      <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
                      {comment.stats && comment.stats.total_votes}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p data-testid="comment-vote-tooltip">
                      {comment.stats && comment.stats.total_votes > 0 ? comment.stats.total_votes : 'no'}
                      {comment.stats && comment.stats.total_votes > 1 ? ' votes' : ' vote'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      <Link href={`/${comment.category}/@${comment.author}/${comment.permlink}`}className="flex cursor-pointer items-center">
                        {comment.children>1?<Icons.messagesSquare className="h-4 w-4 sm:mr-1" />:<Icons.comment className="h-4 w-4 sm:mr-1" />}
                      </Link>
                      <Link
                        href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                        className="flex cursor-pointer items-center hover:text-red-600"
                        data-testid="comment-respond-link"
                      >
                        {comment.children}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p data-testid="comment-respond-tooltip">{` ${
                        comment.children === 0
                          ? 'No responses'
                          : comment.children === 1
                          ? comment.children + ' response'
                          : comment.children + ' responses'
                      }. Click to respond`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardFooter>
        </Card>
      </li>
    </>
  );
};

export default RepliesListItem;
