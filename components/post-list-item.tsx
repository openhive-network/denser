import Link from 'next/link';
import { cn, getPostSummary } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { dateToRelative } from '@/lib/parse-date';
import accountReputation from '@/lib/account-reputation';
import { proxifyImageSrc } from '@/lib/proxify-images';
import { AlertDialogDemo } from './alert-window';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DetailsCardHover from './details-card-hover';

interface IBeneficiary {
  account: string;
  weight: number;
}

const PostListItem = ({ post, sort, historyFeedData }: any) => {
  return (
    <li data-testid="post-list-item" className={sort === 'muted' ? 'opacity-50 hover:opacity-100' : ''}>
      <Card
        className={cn(
          'my-4 px-2 hover:bg-accent  hover:text-accent-foreground dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
        )}
      >
        <CardHeader className="px-0 py-1">
          <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Link href={`@${post.author}`}>
              <img
                className="mr-3 h-[24px] w-[24px] rounded-3xl"
                height="24"
                width="24"
                src={`https://images.hive.blog/u/${post.author}/avatar/small`}
                alt={`${post.author} profile picture`}
                loading="lazy"
              />
            </Link>
            <div className="flex items-center">
              <Link
                href={`@${post.author}`}
                className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white"
                data-testid="post-author"
              >
                {post.author}
              </Link>{' '}
              ({accountReputation(post.author_reputation)})
              {post.blacklists && post.blacklists[0] ? (
                <span className="text-red-600" title={post.blacklists[0]}>
                  ({post.blacklists.length})
                </span>
              ) : null}
              {post.author_title ? (
                <Badge variant="outline" className="ml-1 border-red-600 text-red-600">
                  {post.author_title}
                </Badge>
              ) : null}
              <span className="flex items-center gap-2">
                {post.percent_hbd === 0 ? <Icons.hive className="h-4 w-4" /> : null}
              </span>
              <span className="text-xs md:text-sm">
                &nbsp;in{` `}
                {post.community ? (
                  <Link
                    href={`/${sort}/${post.community}`}
                    className="hover:cursor-pointer hover:text-red-600"
                  >
                    {post.community_title}
                  </Link>
                ) : (
                  <Link
                    href={`/${sort}/${post.category}`}
                    className="hover:cursor-pointer hover:text-red-600"
                  >
                    #{post.category}
                  </Link>
                )}
                <span className="mx-1">•</span>
                <Link href={`${post.url}`} className="hover:cursor-pointer hover:text-red-600">
                  {dateToRelative(post.created)} ago
                </Link>
              </span>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col md:flex-row">
          <div>
            {post.json_metadata.image && post.json_metadata.image[0] ? (
              <Link href={`${post.url}`} data-testid="post-image">
                <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                  <img
                    className="h-ful w-full"
                    src={proxifyImageSrc(post.json_metadata.image[0], 640, 400)}
                    alt="Post image"
                    loading="lazy"
                  />
                </div>
              </Link>
            ) : post.json_metadata.images && post.json_metadata.images[0] ? (
              <Link href={`${post.url}`} data-testid="post-image">
                <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                  <img
                    className="h-ful w-full"
                    src={proxifyImageSrc(post.json_metadata.images[0], 640, 400)}
                    alt="Post image"
                    loading="lazy"
                  />
                </div>
              </Link>
            ) : post.json_metadata.flow?.pictures && post.json_metadata.flow?.pictures[0] ? (
              <Link href={`${post.url}`} data-testid="post-image">
                <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                  <img
                    className="h-ful w-full"
                    src={proxifyImageSrc(post.json_metadata.flow.pictures[0].url, 640, 400)}
                    alt="Post image"
                    loading="lazy"
                  />
                </div>
              </Link>
            ) : post.json_metadata.links &&
              post.json_metadata.links[0] &&
              post.json_metadata.links[0]
                .slice(0, post.json_metadata.links[0].length - 1)
                .endsWith('png' || 'webp' || 'jpeg' || 'jpg') ? (
              <Link href={`${post.url}`} data-testid="post-image">
                <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                  <img
                    className="h-ful w-full"
                    src={proxifyImageSrc(
                      post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1),
                      640,
                      400
                    )}
                    alt="Post image"
                    loading="lazy"
                  />
                </div>
              </Link>
            ) : null}
          </div>
          <div>
            <CardContent>
              <CardTitle data-testid="post-title" className="text-md">
                <Link href={`${post.url}`}>{post.title}</Link>
                {post.stats.is_pinned ? <Badge className="ml-1 bg-red-600 text-white">Pinned</Badge> : null}
              </CardTitle>
              <CardDescription>
                <Link href={`${post.url}`}>{getPostSummary(post.json_metadata, post.body)}</Link>
                <Separator orientation="horizontal" className="my-1" />
              </CardDescription>
            </CardContent>
            <CardFooter className="pb-2">
              <div className="flex h-5 items-center space-x-2 text-sm">
                <div className="flex items-center gap-1">
                  <Icons.arrowUpCircle className="h-4 w-4 hover:text-red-600 sm:mr-1" />
                  <Icons.arrowDownCircle className="h-4 w-4 hover:text-gray-600 sm:mr-1" />
                </div>

                <DetailsCardHover post={post} historyFeedData={historyFeedData}>
                  <div
                    className={`flex items-center hover:cursor-pointer ${
                      Number(post.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
                    }`}
                    data-testid="post-payout"
                  >
                    <Icons.dollar className="h-4 w-4 text-red-600 sm:mr-1" />
                    {post.payout.toFixed(2)}
                  </div>
                </DetailsCardHover>

                <Separator orientation="vertical" />
                <div className="flex items-center" data-testid="post-total-votes">
                  <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
                  {post.stats.total_votes}
                </div>
                <Separator orientation="vertical" />
                <div className="flex items-center" data-testid="post-children">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Link
                          href={`${post.url}/#comments`}
                          className="flex cursor-pointer items-center hover:text-red-600"
                        >
                          <Icons.comment className="h-4 w-4 sm:mr-1" />
                          {post.children}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{` ${
                          post.children === 0
                            ? 'No responses'
                            : post.children === 1
                            ? post.children + ' response'
                            : post.children + ' responses'
                        }. Click to respond`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Separator orientation="vertical" />
                <div className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertDialogDemo>
                          <Icons.forward className="h-4 w-4 cursor-pointer hover:text-red-600" />
                        </AlertDialogDemo>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Reblog @{post.author}/{post.permlink}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </li>
  );
};

export default PostListItem;
