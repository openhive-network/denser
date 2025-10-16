import { Icons } from '@hive/ui/components/icons';
import parseDate from '@hive/ui/lib/parse-date';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@hive/ui/components/card';
import { getPostSummary } from '@/blog/lib/utils';
import Link from 'next/link';
import { Separator } from '@ui/components/separator';
import accountReputation from '@/blog/lib/account-reputation';
import { Badge } from '@hive/ui/components/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import DetailsCardHover from '../features/list-of-posts/details-card-hover';
import clsx from 'clsx';
import PostImage from '../features/list-of-posts/post-img';
import { useTranslation } from 'next-i18next';
import VotesComponent from '../features/votes/votes-component';
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import TimeAgo from '@hive/ui/components/time-ago';
import { getUserAvatarUrl } from '@hive/ui';

const RepliesListItem = ({
  comment,
  blacklist
}: {
  comment: Entry;
  blacklist: IFollowList[] | undefined;
}) => {
  const { t } = useTranslation('common_blog');
  const blacklistCheck = blacklist ? blacklist.some((e) => e.name === comment.author) : false;
  const userFromDMCA = dmcaUserList.includes(comment.author);
  const legalBlockedUser = userIllegalContent.includes(comment.author);

  if (gdprUserList.includes(comment.author)) {
    return null;
  }

  return (
    <>
      <li
        className={clsx({
          'opacity-60 hover:opacity-100': comment.stats?.gray
        })}
        data-testid="comment-list-item"
      >
        <Card className="mb-4 bg-background px-2 text-primary">
          <CardHeader className="px-0 py-1">
            <div className="md:text-md flex items-center text-xs">
              <Link href={`/@${comment.author}`} data-testid="comment-author-avatar-link">
                <img
                  className="mr-3 h-[24px] w-[24px] rounded-3xl"
                  height="24"
                  width="24"
                  src={getUserAvatarUrl(comment.author, 'small')}
                  alt={`${comment.author} profile picture`}
                  loading="lazy"
                  data-testid="comment-author-avatar"
                />
              </Link>
              <div className="flex items-center">
                <Link
                  href={`/@${comment.author}`}
                  className="font-medium hover:cursor-pointer hover:text-destructive dark:hover:text-destructive"
                  data-testid="post-author"
                >
                  {comment.author}
                </Link>{' '}
                <span title={t('cards.post_card.reputation_title')}>
                  ({accountReputation(comment.author_reputation)})
                </span>
                {comment.blacklists && comment.blacklists[0] ? (
                  <span className="text-destructive" title={comment.blacklists[0]}>
                    ({comment.blacklists.length})
                  </span>
                ) : blacklistCheck ? (
                  <span className="text-destructive" title="My blacklist">
                    (1)
                  </span>
                ) : null}
                {comment.author_title ? (
                  <Badge variant="outline" className="mr-1 border-destructive px-1 py-0 font-thin">
                    {comment.author_title}
                  </Badge>
                ) : null}
                <span className="flex items-center gap-2">
                  {comment.percent_hbd === 0 ? <Icons.hive className="h-4 w-4" /> : null}
                </span>
                <span className="text-xs md:text-sm">
                  &nbsp;{t('cards.post_card.in')}
                  {` `}
                  {comment.community ? (
                    <Link
                      href={`/trending/${comment.community}`}
                      className="hover:cursor-pointer hover:text-destructive"
                      data-testid="comment-community-category-link"
                    >
                      {comment.community_title}
                    </Link>
                  ) : (
                    <Link
                      href={`/trending/${comment.category}`}
                      className="hover:cursor-pointer hover:text-destructive"
                      data-testid="comment-community-category-link"
                    >
                      #{comment.category}
                    </Link>
                  )}
                  <span className="mx-1">•</span>
                  <Link
                    href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                    className="hover:cursor-pointer hover:text-destructive"
                    data-testid="comment-timestamp"
                    title={String(parseDate(comment.created))}
                  >
                    <TimeAgo date={comment.created} />
                  </Link>
                </span>
              </div>
            </div>
          </CardHeader>
          <div className="flex flex-col md:flex-row">
            <PostImage post={comment} />
            <CardContent>
              <CardTitle data-testid="comment-card-title">
                <Link
                  href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                  className="visited:text-gray-500 dark:visited:text-gray-400"
                >
                  {comment.title}
                </Link>
              </CardTitle>
              <CardDescription className="w-full" data-testid="comment-card-description">
                <Link href={`/${comment.category}/@${comment.author}/${comment.permlink}`}>
                  {userFromDMCA
                    ? t('cards.content_removed')
                    : legalBlockedUser
                      ? t('global.unavailable_for_legal_reasons')
                      : getPostSummary(comment.json_metadata, comment.body)}
                </Link>
              </CardDescription>
            </CardContent>
          </div>
          <CardFooter>
            <div className="flex h-5 items-center space-x-4 text-sm" data-testid="comment-card-footer">
              <VotesComponent post={comment} type="comment" />
              <DetailsCardHover
                post={comment}
                decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
              >
                <div
                  data-testid="post-payout"
                  className={`flex items-center hover:cursor-pointer hover:text-destructive ${
                    Number(comment.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
                  }`}
                >
                  ${comment.payout.toFixed(2)}
                </div>
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
                        {comment.stats && comment.stats.total_votes === 0
                          ? t('post_content.footer.no_votes')
                          : comment.stats && comment.stats.total_votes === 1
                            ? t('post_content.footer.vote')
                            : t('post_content.footer.votes', {
                                votes: comment.stats && comment.stats.total_votes
                              })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center">
                      <>
                        <Link
                          href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                          className="flex cursor-pointer items-center"
                        >
                          {comment.children > 1 ? (
                            <Icons.messagesSquare className="h-4 w-4" />
                          ) : (
                            <Icons.comment className="h-4 w-4" />
                          )}
                        </Link>
                        <Link
                          href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                          className="flex cursor-pointer items-center pl-1 hover:text-destructive"
                          data-testid="comment-respond-link"
                        >
                          {comment.children}
                        </Link>
                      </>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p data-testid="comment-respond-tooltip">
                        {comment.children === 0
                          ? t('post_content.footer.no_responses')
                          : comment.children === 1
                            ? t('post_content.footer.response')
                            : t('post_content.footer.responses', { responses: comment.children })}
                        {t('cards.post_card.click_to_respond')}
                      </p>
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
