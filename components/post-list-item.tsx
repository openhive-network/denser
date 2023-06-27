import Link from 'next/link';
import { cn, getPostSummary } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { dateToRelative } from '@/lib/parse-date';
import accountReputation from '@/lib/account-reputation';
import { AlertDialogDemo } from './alert-window';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DetailsCardHover from './details-card-hover';
import DialogLogin from '@/components/dialog-login';
import { useRouter } from 'next/router';
import { proxifyImageUrl } from '@/lib/old-profixy';
import { customEndsWith } from '@/lib/ends-with';
import { useState } from 'react';

interface IBeneficiary {
  account: string;
  weight: number;
}

const PostListItem = ({ post, sort, historyFeedData }: any) => {
  const [reveal, setReveal] = useState<boolean>(
    () => post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw')
  );
  const router = useRouter();

  function revealPost() {
    setReveal((reveal) => !reveal);
  }

  return (
    <li data-testid="post-list-item" className={sort === 'muted' ? 'opacity-50 hover:opacity-100' : ''}>
      <Card
        className={cn(
          'my-4 px-2 hover:bg-accent  hover:text-accent-foreground dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
        )}
      >
        {post.reblogged_by ? (
          <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
            <Icons.forward className="h-4 w-4" />
            <span>
              <Link href={`/${post.reblogged_by[0]}`} className="cursor-pointer hover:text-red-600">
                {post.reblogged_by[0]}
              </Link>{' '}
              reblogged
            </span>
          </div>
        ) : null}
        <CardHeader className="px-0 py-1">
          <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Link href={`@${post.author}`}>
              <div
                className="mr-3 h-[24px] w-[24px] rounded-3xl bg-cover bg-no-repeat"
                style={{ backgroundImage: `url(https://images.hive.blog/u/${post.author}/avatar/small)` }}
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>({accountReputation(post.author_reputation)})</TooltipTrigger>
                  <TooltipContent>Reputation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {post.blacklists && post.blacklists[0] ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-red-600">({post.blacklists.length})</span>
                    </TooltipTrigger>
                    <TooltipContent>{post.blacklists[0]}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {post.author_title ? (
                <Badge variant="outline" className="ml-1 border-red-600 text-red-600">
                  {post.author_title}
                </Badge>
              ) : null}
              {(router.query.param ? router.query.param[1]?.startsWith('hive-') : false) &&
              post.author_role &&
              post.author_role !== 'guest' ? (
                <span className="text-xs md:text-sm">&nbsp;{post.author_role.toUpperCase()}</span>
              ) : null}
              <span className="flex items-center text-xs md:text-sm">
                &nbsp;in&nbsp;
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
                {post.percent_hbd === 0 ? (
                  <span className="ml-1 flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link href={`${post.url}`}>
                            <Icons.hive className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Powered Up 100%</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                ) : null}
                {post.stats.is_pinned ? (
                  <Badge className="ml-1 bg-red-600 text-white hover:bg-red-600">
                    <Link href={`${post.url}`}>Pinned</Link>
                  </Badge>
                ) : null}
              </span>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col md:flex-row">
          <div>
            {!reveal ? (
              <>
                {post.json_metadata.image && post.json_metadata.image[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(post.json_metadata.image[0], '256x512').replace(
                            / /g,
                            '%20'
                          )}
                          media="(min-width: 1000px)"
                        />
                        <img srcSet={post.json_metadata.image[0]} alt="Post image" loading="lazy" />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.images && post.json_metadata.images[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(post.json_metadata.images[0], '256x512').replace(
                            / /g,
                            '%20'
                          )}
                          media="(min-width: 1000px)"
                        />
                        <img srcSet={post.json_metadata.images[0]} alt="Post image" loading="lazy" />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.flow?.pictures && post.json_metadata.flow?.pictures[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(post.json_metadata.flow.pictures[0].url, '256x512').replace(
                            / /g,
                            '%20'
                          )}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.flow.pictures[0].url}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.links &&
                  post.json_metadata.links[0] &&
                  customEndsWith(
                    post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1),
                    ['png', 'webp', 'jpeg', 'jpg']
                  ) ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1),
                            '256x512'
                          ).replace(/ /g, '%20')}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.links[0].slice(
                            0,
                            post.json_metadata.links[0].length - 1
                          )}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="md:overflow-hidden">
            <CardContent>
              {!reveal ? (
                <>
                  <CardTitle data-testid="post-title" className="text-md">
                    <Link href={`${post.url}`}>{post.title}</Link>
                  </CardTitle>
                  <CardDescription className="block w-auto md:overflow-hidden md:overflow-ellipsis md:whitespace-nowrap">
                    <Link href={`${post.url}`}>{getPostSummary(post.json_metadata, post.body)}</Link>
                  </CardDescription>
                  <Separator orientation="horizontal" className="my-1" />
                </>
              ) : (
                <>
                  <p>
                    <Badge variant="outline" className="mx-1 border-red-600 text-red-600">
                      nsfw
                    </Badge>
                    <span className="cursor-pointer text-red-600" onClick={revealPost}>
                      Reveal this post
                    </span>{' '}
                    or{' '}
                    <Link href="https://signup.hive.io/" className="cursor-pointer text-red-600">
                      create an account
                    </Link>{' '}
                    to save your preferences.
                  </p>
                </>
              )}
            </CardContent>
            <CardFooter className="pb-2">
              <div className="flex h-5 items-center space-x-2 text-sm">
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <DialogLogin>
                          <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                        </DialogLogin>
                      </TooltipTrigger>
                      <TooltipContent>Upvote</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <DialogLogin>
                          <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                        </DialogLogin>
                      </TooltipTrigger>
                      <TooltipContent>Downvote</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <DetailsCardHover
                  post={post}
                  historyFeedData={historyFeedData}
                  decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}
                >
                  <div
                    className={`flex items-center hover:cursor-pointer hover:text-red-600 ${
                      Number(post.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
                    }`}
                    data-testid="post-payout"
                  >
                    ${post.payout.toFixed(2)}
                  </div>
                </DetailsCardHover>

                <Separator orientation="vertical" />
                <div className="flex items-center" data-testid="post-total-votes">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center">
                        <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
                        {post.stats.total_votes}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{post.stats.total_votes > 0 ? post.stats.total_votes : 'no'} votes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Separator orientation="vertical" />
                <div className="flex items-center" data-testid="post-children">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center">
                        <Link href={`${post.url}/#comments`} className="flex cursor-pointer items-center">
                          <Icons.comment className="h-4 w-4 sm:mr-1" />
                        </Link>
                        <Link
                          href={`${post.url}/#comments`}
                          className="flex cursor-pointer items-center hover:text-red-600"
                        >
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
                          <Icons.forward className="h-4 w-4 cursor-pointer" />
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
