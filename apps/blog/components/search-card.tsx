import { useState } from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator
} from '@hive/ui';
import Link from 'next/link';
import BasePathLink from './base-path-link';
import { proxifyImageUrl } from '@ui/lib/old-profixy';
import { extractBodySummary } from '@/blog/lib/utils';
import ReblogTrigger from '../components/reblog-trigger';
import parseDate from '@ui/lib/parse-date';
import { useTranslation } from 'next-i18next';
import PostCardCommentTooltip from './post-card-comment-tooltip';
import PostCardUpvotesTooltip from './post-card-upvotes-tooltip';
import PostCardHidden from './post-card-hidden';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { SearchResult } from '@transaction/lib/bridge';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import PostCardBlacklistMark from './post-card-blacklist-mark';
import TimeAgo from '@hive/ui/components/time-ago';
import { getUserAvatarUrl } from '@hive/ui';

interface SearchCardProps {
  post: SearchResult;
  nsfw: 'show' | 'warn' | 'hide';
  blacklist: IFollowList[] | undefined;
}

const SearchCard = ({ post, nsfw, blacklist }: SearchCardProps) => {
  const { t } = useTranslation('common_blog');
  const [reveal, setReveal] = useState(
    nsfw === 'show'
      ? false
      : nsfw === 'warn'
        ? post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw')
        : false
  );
  const { user } = useUser();
  const blacklistCheck = blacklist ? blacklist.some((e) => e.name === post.author) : false;
  const userFromDMCA = dmcaUserList.includes(post.author);
  const userFromImageBlockList = imageUserBlocklist.includes(post.author);
  const legalBlockedUser = userIllegalContent.includes(post.author);
  const revealPost = () => setReveal((prev) => !prev);

  if (gdprUserList.includes(post.author)) return null;

  return (
    <li>
      {post.tags.includes('nsfw') && nsfw === 'hide' ? null : (
        <Card className="mb-4 bg-background px-2 text-primary">
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-sm">
              {!reveal ? (
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
                  ({Number(post.author_reputation).toFixed(0)})
                </span>
                <PostCardBlacklistMark blacklistCheck={blacklistCheck} />
                &nbsp;{t('cards.post_card.in')}&nbsp;
                <Link
                  href={`/trending/${post.category}`}
                  className="hover:cursor-pointer hover:text-destructive"
                  data-testid="post-card-community"
                >
                  #{post.category}
                </Link>
                <span className="mx-1">•</span>
                <Link
                  href={`/${post.category}/@${post.author}/${post.permlink}`}
                  className="hover:cursor-pointer hover:text-destructive"
                  data-testid="post-card-timestamp"
                >
                  <span title={String(parseDate(post.created))}>
                    <TimeAgo date={post.created} />
                  </span>
                </Link>
              </div>
            </div>
          </CardHeader>
          <div className="flex flex-col md:flex-row">
            {!reveal && !userFromDMCA && !userFromImageBlockList && !legalBlockedUser ? (
              <Link href={`/${post.category}/@${post.author}/${post.permlink}`} data-testid="post-image">
                <div className="relative flex h-[210px] items-center overflow-hidden bg-transparent sm:h-[360px] md:mr-3.5 md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                  <picture className="articles__feature-img h-ful w-full">
                    <source
                      srcSet={proxifyImageUrl(post.img_url, '256x512').replace(/ /g, '%20')}
                      media="(min-width: 1000px)"
                    />
                    <img srcSet={post.img_url} alt="Post image" loading="lazy" className="w-full" />
                  </picture>
                </div>
              </Link>
            ) : null}
            <div className="md:overflow-hidden">
              {!reveal ? (
                <CardContent>
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
                            : extractBodySummary(post.body, true)}
                      </Link>
                    </CardDescription>
                    <Separator orientation="horizontal" className="my-1" />
                  </>
                </CardContent>
              ) : (
                <PostCardHidden user={user} revealPost={revealPost} />
              )}
              <CardFooter className="pb-2">
                <div className="flex h-5 items-center space-x-2 text-sm" data-testid="post-card-footer">
                  <div data-testid="post-payout">${post.payout.toFixed(2)}</div>
                  <Separator orientation="vertical" />
                  <PostCardUpvotesTooltip votes={post.total_votes} />
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
export default SearchCard;
