'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import BasePathLink from '@/blog/components/base-path-link';
import accountReputation from '@/blog/lib/account-reputation';
import { IFollowList, Entry } from '@transaction/lib/extended-hive.chain';
import DetailsCardHover from './details-card-hover';
import PostImage from './post-img';
import ReblogTrigger from './reblog-trigger';
import PostCardCommentTooltip from './post-card-comment-tooltip';
import PostCardUpvotesTooltip from './post-card-upvotes-tooltip';
import PostCardBlacklistMark from './post-card-blacklist-mark';
import PostSummary from './summary';
import VotesComponent from '@/blog/features/votes/votes-component';
import { Preferences } from '@/blog/lib/utils';
import { useTranslation } from '@/blog/i18n/client';

const PostListItem = ({
  post,
  isCommunityPage,
  blacklist,
  nsfwPreferences
}: {
  post: Entry;
  isCommunityPage: boolean | undefined;
  blacklist: IFollowList[] | undefined;
  nsfwPreferences: Preferences['nsfw'];
}) => {
  const { t } = useTranslation('common_blog');
  const tagExists = Array.isArray(post.json_metadata?.tags) && post.json_metadata.tags.includes('nsfw');
  const [nsfw, setNSFW] = useState<Preferences['nsfw']>(tagExists ? 'warn' : 'show');

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

  return (
    <li data-testid="post-list-item" className={post.stats?.gray ? 'opacity-50 hover:opacity-100' : ''}>
      {nsfw === 'hide' ? null : (
        <Card className="mb-4 bg-background px-2 text-primary">
          {post.original_entry ? (
            <div className="mt-2 rounded-sm bg-background-secondary px-2 py-1 text-sm">
              <p className="flex items-center gap-1 text-xs md:text-sm">
                <Icons.crossPost className="h-4 w-4 text-slate-500 dark:text-slate-400" />{' '}
                <BasePathLink
                  className="hover:cursor-pointer hover:text-destructive"
                  href={`/@${post.author}`}
                >
                  {post.author}
                </BasePathLink>{' '}
                cross-posted{' '}
                <Link
                  href={`/${post.original_entry.community}/@${post.original_entry.author}/${post.original_entry.permlink}`}
                  className="text-destructive hover:cursor-pointer"
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
                <BasePathLink
                  href={`/@${post.reblogged_by[0]}`}
                  className="cursor-pointer hover:text-destructive"
                  data-testid="reblogged-author-link"
                >
                  {post.reblogged_by[0]}
                </BasePathLink>{' '}
                {t('cards.reblogged')}
              </span>
            </div>
          ) : null}
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-sm">
              {nsfw === 'show' && post.blacklists.length < 1 ? (
                <BasePathLink href={`/@${post.author}`} data-testid="post-card-avatar">
                  <div
                    className="mr-3 h-[24px] w-[24px] rounded-3xl bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url(${getUserAvatarUrl(post.author, 'small')})`
                    }}
                  />
                </BasePathLink>
              ) : null}
              <div className="flex flex-wrap items-center gap-0.5 md:flex-nowrap">
                <BasePathLink
                  href={`/@${post.author}`}
                  className="font-medium text-primary hover:cursor-pointer hover:text-destructive"
                  data-testid="post-author"
                >
                  {post.author}
                </BasePathLink>{' '}
                <span
                  title={t('post_content.reputation_title')}
                  className="mr-1 block font-normal"
                  data-testid="post-author-reputation"
                >
                  ({accountReputation(post.author_reputation)})
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
                      {post.community ? (
                        <Link
                          href={`/trending/${post.community}`}
                          className="hover:cursor-pointer hover:text-destructive"
                          data-testid="post-card-community"
                        >
                          {post.community_title}
                        </Link>
                      ) : (
                        <Link
                          href={`/trending/${post.category}`}
                          className="hover:cursor-pointer hover:text-destructive"
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
                            Powered Up 100%
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
              !userFromDMCA &&
              !userFromImageBlockList &&
              !legalBlockedUser ? (
                <>
                  <PostImage post={post} />
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
                  <VotesComponent post={post} type="post" />

                  <DetailsCardHover post={post} decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}>
                    <div
                      className={`flex items-center hover:cursor-pointer hover:text-destructive ${
                        Number(post.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
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
                      <ReblogTrigger
                        author={post.author}
                        permlink={post.permlink}
                        dataTestidTooltipContent="post-card-reblog-tooltip"
                        dataTestidTooltipIcon="post-card-reblog-icon"
                      />
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
