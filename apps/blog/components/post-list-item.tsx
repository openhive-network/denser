import Link from 'next/link';
import { getPostSummary } from '@/blog/lib/utils';
import { cn } from '@ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@hive/ui/components/card';
import { Separator } from '@hive/ui/components/separator';
import { Badge } from '@hive/ui/components/badge';
import parseDate, { dateToFullRelative } from '@hive/ui/lib/parse-date';
import accountReputation from '@/blog/lib/account-reputation';
import { AlertDialogReblog } from './alert-window';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import DetailsCardHover from './details-card-hover';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { Entry, IFollowList } from '@transaction/lib/bridge';
import PostImage from './post-img';
import { useTranslation } from 'next-i18next';
import VotesComponent from './votes';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const PostListItem = ({
  post,
  isCommunityPage,
  blacklist
}: {
  post: Entry;
  isCommunityPage: boolean | undefined;
  blacklist: IFollowList[] | undefined;
}) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const [storedReblogs, setStoredReblogs] = useLocalStorage<string[]>(`reblogged_${user.username}`, ['']);
  const [reveal, setReveal] = useState(
    preferences.nsfw === 'show'
      ? false
      : preferences.nsfw === 'warn'
        ? post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw')
        : false
  );
  const router = useRouter();
  const blacklistCheck = blacklist ? blacklist.some((e) => e.name === post.author) : false;
  const isReblogged = storedReblogs?.includes(`${post.author}/${post.permlink}`);

  function revealPost() {
    setReveal((reveal) => !reveal);
  }

  return (
    <li data-testid="post-list-item" className={post.stats?.gray ? 'opacity-50 hover:opacity-100' : ''}>
      {post.json_metadata?.tags &&
      post.json_metadata?.tags.includes('nsfw') &&
      preferences.nsfw === 'hide' ? null : (
        <Card
          className={cn(
            'mb-4 px-2 hover:bg-accent  hover:text-accent-foreground dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
          )}
        >
          {post.original_entry ? (
            <div className="mt-2 rounded-sm bg-slate-100 px-2 py-1 text-sm dark:bg-slate-900">
              <p className="flex items-center gap-1 text-xs md:text-sm">
                <Icons.crossPost className="h-4 w-4 text-slate-500 dark:text-slate-400" />{' '}
                <Link
                  className="text-slate-500 hover:cursor-pointer hover:text-red-600 dark:text-slate-400"
                  href={`/@${post.author}`}
                >
                  {post.author}
                </Link>{' '}
                cross-posted{' '}
                <Link
                  href={`/${post.original_entry.community}/@${post.original_entry.author}/${post.original_entry.permlink}`}
                  className="text-red-600 hover:cursor-pointer"
                >
                  @{post.original_entry.author}/{post.original_entry.permlink}
                </Link>
              </p>
            </div>
          ) : null}
          {post.reblogged_by ? (
            <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
              <Icons.forward className="h-4 w-4" />
              <span data-testid="reblogged-label">
                <Link
                  href={`/@${post.reblogged_by[0]}`}
                  className="cursor-pointer hover:text-red-600"
                  data-testid="reblogged-author-link"
                >
                  {post.reblogged_by[0]}
                </Link>{' '}
                {t('cards.reblogged')}
              </span>
            </div>
          ) : null}
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
              {!reveal && post.blacklists.length < 1 ? (
                <Link href={`/@${post.author}`} data-testid="post-card-avatar">
                  <div
                    className="mr-3 h-[24px] w-[24px] rounded-3xl bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url(https://images.hive.blog/u/${post.author}/avatar/small)`
                    }}
                  />
                </Link>
              ) : null}
              <div className="flex flex-wrap items-center gap-0.5 md:flex-nowrap">
                <Link
                  href={`/@${post.author}`}
                  className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white dark:hover:text-red-600"
                  data-testid="post-author"
                >
                  {post.author}
                </Link>{' '}
                <span
                  title={t('post_content.reputation_title')}
                  className="mr-1 block font-normal"
                  data-testid="post-author-reputation"
                >
                  ({accountReputation(post.author_reputation)})
                </span>
                {post.blacklists && post.blacklists[0] ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-red-600">({post.blacklists.length})</span>
                      </TooltipTrigger>
                      <TooltipContent>{post.blacklists[0]}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : blacklistCheck ? (
                  <span className="text-red-600" title="My blacklist">
                    (1)
                  </span>
                ) : null}
                {(router.query.param ? router.query.param[1]?.startsWith('hive-') : false) &&
                post.author_role &&
                post.author_role !== 'guest' ? (
                  <span className="text-xs md:text-sm">&nbsp;{post.author_role.toUpperCase()}&nbsp;</span>
                ) : null}
                {post.author_title ? (
                  <Badge variant="outline" className="mr-1 border-red-600 text-slate-500">
                    {post.author_title}
                  </Badge>
                ) : null}
                <span className="flex items-center text-xs md:text-sm">
                  {!isCommunityPage ? (
                    <>
                      &nbsp;{t('cards.post_card.in')}&nbsp;
                      {post.community ? (
                        <Link
                          href={`/trending/${post.community}`}
                          className="hover:cursor-pointer hover:text-red-600"
                          data-testid="post-card-community"
                        >
                          {post.community_title}
                        </Link>
                      ) : (
                        <Link
                          href={`/trending/${post.category}`}
                          className="hover:cursor-pointer hover:text-red-600"
                          data-testid="post-card-category"
                        >
                          #{post.category}
                        </Link>
                      )}
                      <span className="mx-1">•</span>
                    </>
                  ) : null}
                  <Link
                    href={`/${post.category}/@${post.author}/${post.permlink}`}
                    className="hover:cursor-pointer hover:text-red-600"
                    data-testid="post-card-timestamp"
                  >
                    <span title={String(parseDate(post.created))}>{dateToFullRelative(post.created, t)}</span>
                  </Link>
                  {post.percent_hbd === 0 ? (
                    <span className="ml-1 flex items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger data-testid="powered-up-100-trigger">
                            <Link href={`/${post.category}/@${post.author}/${post.permlink}`}>
                              <Icons.hive className="h-4 w-4" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent data-testid="powered-up-100-tooltip">
                            Powered Up 100%
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  ) : null}
                  {post.stats && post.stats.is_pinned && isCommunityPage ? (
                    <Badge className="ml-1 bg-red-600 text-white hover:bg-red-600">
                      <Link
                        href={`/${post.category}/@${post.author}/${post.permlink}`}
                        data-testid="post-pinned-tag"
                      >
                        {t('cards.badges.pinned')}
                      </Link>
                    </Badge>
                  ) : null}
                </span>
              </div>
            </div>
          </CardHeader>
          <div className="flex flex-col md:flex-row">
            <div>
              {!reveal && post.blacklists.length < 1 ? (
                <>
                  <PostImage post={post} />
                </>
              ) : null}
            </div>
            <div className="md:overflow-hidden">
              <CardContent>
                {!reveal ? (
                  <>
                    <CardTitle data-testid="post-title" className="text-md">
                      {post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw') ? (
                        <Badge variant="outline" className="mx-1 border-red-600 text-red-600">
                          nsfw
                        </Badge>
                      ) : null}
                      <Link href={`/${post.category}/@${post.author}/${post.permlink}`}>{post.title}</Link>
                    </CardTitle>
                    <CardDescription className="block w-auto md:overflow-hidden md:overflow-ellipsis md:whitespace-nowrap">
                      <Link
                        href={`/${post.category}/@${post.author}/${post.permlink}`}
                        data-testid="post-description"
                      >
                        {getPostSummary(post.json_metadata, post.body)}
                      </Link>
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
                      {user.isLoggedIn ? (
                        <>
                          adjust your{' '}
                          <Link href={`/@${user.username}/settings`} className="cursor-pointer text-red-600">
                            display preferences.
                          </Link>{' '}
                        </>
                      ) : (
                        <>
                          <Link href="https://signup.hive.io/" className="cursor-pointer text-red-600">
                            create an account
                          </Link>{' '}
                          to save your preferences.
                        </>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
              <CardFooter className="pb-2">
                <div className="flex h-5 items-center space-x-2 text-sm" data-testid="post-card-footer">
                  <VotesComponent post={post} />

                  <DetailsCardHover post={post} decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}>
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
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center" data-testid="post-total-votes">
                          <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
                          {post.stats && post.stats.total_votes}
                        </TooltipTrigger>
                        <TooltipContent data-testid="post-card-votes-tooltip">
                          <p>
                            {post.stats && post.stats.total_votes === 0
                              ? t('cards.post_card.no_votes')
                              : post.stats && post.stats.total_votes > 1
                                ? t('cards.post_card.votes', { votes: post.stats.total_votes })
                                : t('cards.post_card.vote')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Separator orientation="vertical" />
                  <div className="flex items-center" data-testid="post-children">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center">
                          <>
                            <Link
                              href={`/${post.category}/@${post.author}/${post.permlink}/#comments`}
                              className="flex cursor-pointer items-center"
                            >
                              {post.children > 1 ? (
                                <Icons.messagesSquare className="h-4 w-4 sm:mr-1" />
                              ) : (
                                <Icons.comment className="h-4 w-4 sm:mr-1" />
                              )}
                            </Link>
                            <Link
                              href={`/${post.category}/@${post.author}/${post.permlink}/#comments`}
                              className="flex cursor-pointer items-center pl-1 hover:text-red-600"
                              data-testid="post-card-response-link"
                            >
                              {post.children}
                            </Link>
                          </>
                        </TooltipTrigger>
                        <TooltipContent data-testid="post-card-responses">
                          <p>
                            {`${
                              post.children === 0
                                ? t('cards.post_card.no_responses')
                                : post.children === 1
                                  ? t('cards.post_card.response')
                                  : t('cards.post_card.responses', { responses: post.children })
                            }`}
                            {t('cards.post_card.click_to_respond')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Separator orientation="vertical" />
                  {!post.title.includes('RE: ') ? (
                    <div className="flex items-center" data-testid="post-card-reblog">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger disabled={isReblogged}>
                            <AlertDialogReblog
                              author={post.author}
                              permlink={post.permlink}
                              setStoredReblogs={setStoredReblogs}
                            >
                              <Icons.forward
                                className={cn('h-4 w-4 cursor-pointer', {
                                  'text-red-600': isReblogged,
                                  'cursor-default': isReblogged
                                })}
                              />
                            </AlertDialogReblog>
                          </TooltipTrigger>
                          <TooltipContent data-testid="post-card-reblog-tooltip">
                            <p>{
                              isReblogged
                                ? t('cards.post_card.you_reblogged')
                                : t('cards.post_card.reblog')
                            }</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : null}
                </div>
              </CardFooter>
            </div>
          </div>
        </Card>
      )}
    </li>
  );
};

export default PostListItem;
