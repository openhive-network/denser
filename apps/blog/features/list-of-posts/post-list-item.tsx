'use client';

import { memo, useEffect, useState } from 'react';
import { Link } from '@hive/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Card, CardFooter, CardHeader } from '@ui/components/card';
import { Icons } from '@ui/components/icons';
import { Separator } from '@ui/components/separator';
import { Badge } from '@ui/components/badge';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import TimeAgo from '@ui/components/time-ago';
import { getUserAvatarUrl } from '@ui/lib/avatar-utils';
import { accountReputation } from '@hive/ui';
import { IFollowList, Entry } from '@hive/common-hiveio-packages/wax';
import { cn } from '@ui/lib/utils';
import { handleError } from '@ui/lib/handle-error';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DetailsCardHover from './details-card-hover';
import PostImage from './post-img';
import { ReblogDialog } from './reblog-dialog';
import { useReblogMutation } from './hooks/use-reblog-mutation';
import PostCardCommentTooltip from './post-card-comment-tooltip';
import PostCardUpvotesTooltip from './post-card-upvotes-tooltip';
import PostCardBlacklistMark from './post-card-blacklist-mark';
import PostSummary from './summary';
import { Preferences } from '@/blog/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import VotesComponentWrapper from '@/blog/features/votes/votes-component-wrapper';

interface PostListItemProps {
  post: Entry;
  isCommunityPage: boolean | undefined;
  blacklist: IFollowList[] | undefined;
  nsfwPreferences: Preferences['nsfw'];
  // Eagerly load this card's image (set for the first card — the LCP element)
  priority?: boolean;
}

function arePostListItemPropsEqual(prev: PostListItemProps, next: PostListItemProps): boolean {
  // Check primitive props first (fast)
  if (prev.isCommunityPage !== next.isCommunityPage) return false;
  if (prev.nsfwPreferences !== next.nsfwPreferences) return false;
  if (prev.blacklist !== next.blacklist) return false;
  if (prev.priority !== next.priority) return false;

  // Check post identity and changing fields
  const prevPost = prev.post;
  const nextPost = next.post;

  return (
    prevPost.author === nextPost.author &&
    prevPost.permlink === nextPost.permlink &&
    prevPost.pending_payout_value === nextPost.pending_payout_value &&
    prevPost.payout === nextPost.payout &&
    prevPost.children === nextPost.children &&
    prevPost.reblogs === nextPost.reblogs &&
    prevPost.stats?.total_votes === nextPost.stats?.total_votes &&
    prevPost.stats?.gray === nextPost.stats?.gray &&
    prevPost.stats?.is_pinned === nextPost.stats?.is_pinned &&
    prevPost.blacklists === nextPost.blacklists &&
    prevPost.author_reputation === nextPost.author_reputation
  );
}

const PostListItem = memo(
  function PostListItem({ post, isCommunityPage, blacklist, nsfwPreferences, priority }: PostListItemProps) {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const reblogMutation = useReblogMutation();
  const tagExists = Array.isArray(post.json_metadata?.tags) && post.json_metadata.tags.includes('nsfw');
  const [nsfw, setNSFW] = useState<Preferences['nsfw']>(tagExists ? 'warn' : 'show');
  const reblogCount = post.reblogs ?? 0;

  const handleReblog = async () => {
    try {
      await reblogMutation.mutateAsync({ author: post.author, permlink: post.permlink, username: user.username });
    } catch (error) {
      handleError(error, { method: 'reblog', params: { author: post.author, permlink: post.permlink, username: user.username } });
    }
  };

  const dialogAction = (dialogResponse: boolean): void => {
    if (dialogResponse) {
      handleReblog();
    }
  };

  useEffect(() => {
    if (tagExists) {
      setNSFW(nsfwPreferences);
    }
  }, [nsfwPreferences, tagExists]);

  const blacklistCheck = blacklist ? blacklist.some((e) => e.name === post.author) : false;
  const userFromDMCA = dmcaUserList.includes(post.author);
  const userFromImageBlockList = imageUserBlocklist.includes(post.author);
  const legalBlockedUser = userIllegalContent.includes(post.author);

  if (gdprUserList.includes(post.author)) return null;

  // For cross-posts, source identity fields (author name, avatar, reputation,
  // origin community) from the original post. Engagement fields (payout, vote
  // count, comment count, timestamp, clicked URL) remain from this cross-post
  // entry since they describe this specific on-chain object, not the original.
  // Matches the convention used by hive.blog and aligns with peakd / ecency
  // crediting the original content creator.
  const displayAuthor = post.original_entry?.author ?? post.author;
  const displayReputation = post.original_entry?.author_reputation ?? post.author_reputation;
  const displayCommunity = post.original_entry?.community ?? post.community;
  const displayCommunityTitle = post.original_entry?.community_title ?? post.community_title;
  const displayCategory = post.original_entry?.category ?? post.category;

  return (
    <li data-testid="post-list-item" className={post.stats?.gray ? 'opacity-50 hover:opacity-100' : ''}>
      {nsfw === 'hide' ? null : (
        <Card className="mb-4 bg-background px-2 text-primary">
          {post.original_entry ? (
            <div className="mt-2 rounded-sm bg-background-secondary px-2 py-1 text-sm" data-testid="cross-post-banner">
              <p className="flex items-center gap-1 text-xs md:text-sm">
                <Icons.crossPost className="h-4 w-4 text-slate-500 dark:text-slate-400" />{' '}
                <Link className="hover:cursor-pointer hover:text-destructive" href={`/@${post.author}`} data-testid="cross-post-author-link">
                  {post.author}
                </Link>{' '}
                cross-posted{' '}
                <Link
                  href={`/${post.original_entry.community}/@${post.original_entry.author}/${post.original_entry.permlink}`}
                  className="text-destructive hover:cursor-pointer"
                  data-testid="cross-post-original-link"
                >
                  @{post.original_entry.author}/{post.original_entry.permlink}
                </Link>
              </p>
            </div>
          ) : null}
          {post.reblogged_by ? (
            <div className="flex items-center gap-2 py-1 text-sm">
              <Icons.forward className="h-4 w-4" />
              <span data-testid="reblogged-label">
                <Link
                  href={`/@${post.reblogged_by[0]}`}
                  className="cursor-pointer hover:text-destructive"
                  data-testid="reblogged-author-link"
                >
                  {post.reblogged_by[0]}
                </Link>{' '}
                {t('cards.reblogged')}
              </span>
            </div>
          ) : null}
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-sm">
              {nsfw === 'show' && post.blacklists.length < 1 && !blacklistCheck ? (
                <Link href={`/@${displayAuthor}`} data-testid="post-card-avatar">
                  <div
                    className="mr-3 h-[24px] w-[24px] rounded-3xl bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url(${getUserAvatarUrl(displayAuthor, 'small')})`
                    }}
                  />
                </Link>
              ) : null}
              <div className="flex flex-wrap items-center gap-0.5 md:flex-nowrap">
                <Link
                  href={`/@${displayAuthor}`}
                  className="font-medium text-primary hover:cursor-pointer hover:text-destructive"
                  data-testid="post-author"
                >
                  {displayAuthor}
                </Link>{' '}
                <span
                  title={t('post_content.reputation_title')}
                  className="mr-1 block font-normal"
                  data-testid="post-author-reputation"
                >
                  ({accountReputation(displayReputation)})
                </span>
                <PostCardBlacklistMark blacklistCheck={blacklistCheck} blacklists={post.blacklists} />
                {post.author_role && post.author_role !== 'guest' && isCommunityPage ? (
                  <span className="text-xs md:text-sm">&nbsp;{post.author_role.toUpperCase()}&nbsp;</span>
                ) : null}
                {post.author_title ? (
                  <Badge variant="outline" className="mr-1 border-destructive px-1 py-0 font-thin">
                    {post.author_title}
                  </Badge>
                ) : null}
                <span className="flex items-center text-xs md:text-sm">
                  {!isCommunityPage ? (
                    <>
                      &nbsp;{t('cards.post_card.in')}&nbsp;
                      {displayCommunity ? (
                        <Link
                          href={`/trending/${displayCommunity}`}
                          className="hover:cursor-pointer hover:text-destructive"
                          data-testid="post-card-community"
                        >
                          {displayCommunityTitle}
                        </Link>
                      ) : (
                        <Link
                          href={`/trending/${displayCategory}`}
                          className="hover:cursor-pointer hover:text-destructive"
                          data-testid="post-card-category"
                        >
                          #{displayCategory}
                        </Link>
                      )}
                      <span className="mx-1">•</span>
                    </>
                  ) : null}
                  <Link
                    href={`/${post.category}/@${post.author}/${post.permlink}`}
                    className="hover:cursor-pointer hover:text-destructive"
                    data-testid="post-card-timestamp"
                  >
                    <TimeAgo date={post.created} />
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
                            {t('cards.post_card.powered_up_100')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  ) : null}
                  {post.stats && post.stats.is_pinned && isCommunityPage ? (
                    <Badge className="ml-1 bg-destructive text-white hover:bg-destructive">
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
          <div className="flex w-full flex-col md:flex-row ">
            <div>
              {nsfw === 'show' &&
              post.blacklists.length < 1 &&
              !blacklistCheck &&
              !userFromDMCA &&
              !userFromImageBlockList &&
              !legalBlockedUser ? (
                <>
                  <PostImage post={post} priority={priority} />
                </>
              ) : null}
            </div>
            <div className="w-full md:overflow-hidden">
              <PostSummary
                post={post}
                nsfw={nsfw}
                setNSFW={setNSFW}
                userFromDMCA={userFromDMCA}
                legalBlockedUser={legalBlockedUser}
              />
              <CardFooter className="pb-2">
                <div className="flex h-5 items-center space-x-2 text-sm" data-testid="post-card-footer">
                  <VotesComponentWrapper post={post} type="post" />

                  <DetailsCardHover post={post} decline={parseFloat(post.max_accepted_payout) === 0}>
                    <div
                      className={`flex items-center hover:cursor-pointer hover:text-destructive ${
                        parseFloat(post.max_accepted_payout) === 0 ? 'text-gray-600 line-through' : ''
                      }`}
                      data-testid="post-payout"
                    >
                      ${post.payout.toFixed(2)}
                    </div>
                  </DetailsCardHover>

                  <Separator orientation="vertical" />
                  {post.stats ? <PostCardUpvotesTooltip votes={post.stats.total_votes} /> : null}
                  <Separator orientation="vertical" />
                  <PostCardCommentTooltip
                    comments={post.children}
                    url={`/${post.category}/@${post.author}/${post.permlink}/#comments`}
                  />
                  <Separator orientation="vertical" />
                  {!post.title.includes('RE: ') ? (
                    <div className="flex items-center" data-testid="post-card-reblog">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <ReblogDialog author={post.author} permlink={post.permlink} action={dialogAction}>
                                <button
                                  disabled={reblogMutation.isLoading}
                                  className={cn(
                                    'flex items-center cursor-pointer hover:text-destructive',
                                    { 'cursor-not-allowed opacity-50': reblogMutation.isLoading }
                                  )}
                                  data-testid="post-card-reblog-count"
                                >
                                  <Icons.forward className="h-4 w-4 sm:mr-1" />
                                  {reblogCount}
                                </button>
                              </ReblogDialog>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent data-testid="post-card-reblog-count-tooltip">
                            <p>{t('cards.post_card.reblog')}</p>
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
  },
  arePostListItemPropsEqual
);

export default PostListItem;
