import Link from 'next/link';
import { getPostSummary } from '@/blog/lib/utils';
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
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import { getLogger } from '@ui/lib/logging';
import ReblogTrigger from './reblog-trigger';
import PostCardCommentTooltip from './post-card-comment-tooltip';
import PostCardUpvotesTooltip from './post-card-upvotes-tooltip';
import PostCardHidden from './post-card-hidden';
import PostCardBlacklistMark from './post-card-blacklist-mark';

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
  const [reveal, setReveal] = useState(
    preferences.nsfw === 'show'
      ? false
      : preferences.nsfw === 'warn'
        ? post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw')
        : false
  );
  const router = useRouter();
  const blacklistCheck = blacklist ? blacklist.some((e) => e.name === post.author) : false;
  const userFromDMCA = dmcaUserList.includes(post.author);
  const userFromImageBlockList = imageUserBlocklist.includes(post.author);
  const legalBlockedUser = userIllegalContent.includes(post.author);

  const revealPost = () => setReveal((reveal) => !reveal);

  if (gdprUserList.includes(post.author)) return null;

  return (
    <li data-testid="post-list-item" className={post.stats?.gray ? 'opacity-50 hover:opacity-100' : ''}>
      {post.json_metadata?.tags &&
      post.json_metadata?.tags.includes('nsfw') &&
      preferences.nsfw === 'hide' ? null : (
        <Card className="mb-4 bg-background px-2 text-primary">
          {post.original_entry ? (
            <div className="mt-2 rounded-sm bg-background-secondary px-2 py-1 text-sm">
              <p className="flex items-center gap-1 text-xs md:text-sm">
                <Icons.crossPost className="h-4 w-4 text-slate-500 dark:text-slate-400" />{' '}
                <Link className="hover:cursor-pointer hover:text-destructive" href={`/@${post.author}`}>
                  {post.author}
                </Link>{' '}
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
                  className="font-medium text-primary hover:cursor-pointer hover:text-destructive"
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
                <PostCardBlacklistMark blacklistCheck={blacklistCheck} blacklists={post.blacklists} />
                {(router.query.param ? router.query.param[1]?.startsWith('hive-') : false) &&
                post.author_role &&
                post.author_role !== 'guest' ? (
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
          <div className="flex flex-col md:flex-row">
            <div>
              {!reveal &&
              post.blacklists.length < 1 &&
              !userFromDMCA &&
              !userFromImageBlockList &&
              !legalBlockedUser ? (
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
                        <Badge variant="outline" className="mx-1 border-destructive text-destructive">
                          nsfw
                        </Badge>
                      ) : null}
                      <Link
                        href={`/${post.category}/@${post.author}/${post.permlink}`}
                        className="visited:text-gray-500 dark:visited:text-gray-400"
                      >
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="block w-auto md:overflow-hidden md:overflow-ellipsis md:whitespace-nowrap">
                      <Link
                        href={`/${post.category}/@${post.author}/${post.permlink}`}
                        data-testid="post-description"
                      >
                        {userFromDMCA
                          ? t('cards.content_removed')
                          : legalBlockedUser
                            ? t('global.unavailable_for_legal_reasons')
                            : getPostSummary(post.json_metadata, post.body)}
                      </Link>
                    </CardDescription>
                    <Separator orientation="horizontal" className="my-1" />
                  </>
                ) : (
                  <PostCardHidden user={user} revealPost={revealPost} />
                )}
              </CardContent>
              <CardFooter className="pb-2">
                <div className="flex h-5 items-center space-x-2 text-sm" data-testid="post-card-footer">
                  <VotesComponent post={post} />

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
