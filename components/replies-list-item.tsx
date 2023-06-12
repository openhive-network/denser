import { Icons } from '@/components/icons';
import { dateToRelative } from '@/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, getPostSummary } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import accountReputation from '@/lib/account-reputation';
import { Badge } from '@/components/ui/badge';

const RepliesListItem = ({ comment }: any) => {
  return (
    <>
      <li data-testid="comment-list-item">
        <Card
          className={cn(
            'my-4 px-2 hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
          )}
        >
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Link href={`@${comment.author}`}>
                <img
                  className="mr-3 h-[24px] w-[24px] rounded-3xl"
                  height="24"
                  width="24"
                  src={`https://images.hive.blog/u/${comment.author}/avatar/small`}
                  alt={`${comment.author} profile picture`}
                  loading="lazy"
                />
              </Link>
              <div className="flex items-center">
                <Link
                  href={`@${comment.author}`}
                  className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white"
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
                  <Badge variant="outline" className="ml-1 border-red-600 text-red-600">
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
                    >
                      {comment.community_title}
                    </Link>
                  ) : (
                    <Link
                      href={`/trending/${comment.category}`}
                      className="hover:cursor-pointer hover:text-red-600"
                    >
                      #{comment.category}
                    </Link>
                  )}
                  <span className="mx-1">•</span>
                  <Link href={`${comment.url}`} className="hover:cursor-pointer hover:text-red-600">
                    {dateToRelative(comment.created)} ago
                  </Link>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle data-testid="comment-card-title">{comment.title}</CardTitle>
            <CardDescription className="w-full" data-testid="comment-card-description">
              {getPostSummary(comment.json_metadata, comment.body)}
            </CardDescription>
          </CardContent>
          <CardFooter>
            <div className="flex h-5 items-center space-x-4 text-sm" data-testid="comment-card-footer">
              <div className="flex items-center">
                <Icons.arrowUpCircle className="mr-1 h-4 w-4 cursor-pointer hover:text-red-600" />
                <Icons.arrowDownCircle className="4 mr-1 h-4 cursor-pointer hover:text-gray-600" />
              </div>
              <div className="flex items-center">
                <Icons.dollar className="mr-1 h-4 w-4 text-red-600" />
                {comment.payout.toFixed(2)}
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <Icons.chevronUp className="mr-1 h-4 w-4" />
                {comment.stats.total_votes}
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <Icons.comment className="mr-1 h-4 w-4 cursor-pointer hover:text-red-600" />
                {comment.children}
              </div>
            </div>
          </CardFooter>
        </Card>
      </li>
    </>
  );
};

export default RepliesListItem;
