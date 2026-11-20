'use client';

import { Icons } from '@hive/ui/components/icons';
import { Card, CardHeader } from '@hive/ui/components/card';
import { cn } from '@hive/ui/lib/utils';
import { Link } from '@hive/ui';
import { Separator } from '@ui/components/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import DetailsCardHover from '../list-of-posts/details-card-hover';
import { IFollowList, Entry } from '@hive/common-hiveio-packages/wax';
import clsx from 'clsx';
import { Badge } from '@ui/components/badge';
import LiteAuthorBadge from '../lite-account/lite-author-badge';
import { isLiteDid } from '../lite-account/lite-did';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import { CircleSpinner } from '@ui/components/circle-spinner';
import ChangeTitleDialog from '../community-profile/change-title-dialog';
import { AlertDialogFlag } from './alert-window-flag';
import FlagTooltip from './flag-icon';
import TimeAgo from '@hive/ui/components/time-ago';
import { getUserAvatarUrl, UserAvatarImg } from '@hive/ui';
import { UserPopoverCard } from './user-popover-card';
import { useTranslation } from '@/blog/i18n/client';
import VotesComponentWrapper from '@/blog/features/votes/votes-component-wrapper';
import { getCommentMuteReasonKey } from '@/blog/lib/muted-reasons';
import CommentListItemContent from './comment-list-item-content';
import { useLocale } from '@ui/components/locale-context';
import { formatDateTime, formatDollars } from '@ui/lib/locale-format';

interface CommentListProps {
  permissionToMute: Boolean;
  comment: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  parentPermlink: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  parentAuthor: string;
  flagText: string | undefined;
  onCommnentLinkClick: (hash: string) => void;
  children?: ReactNode;
}
const CommentListItem = memo(function CommentListItem({
  permissionToMute,
  comment,
  parent_depth,
  mutedList,
  parentPermlink,
  parentAuthor,
  flagText,
  discussionAuthor,
  discussionPermlink,
  observer,
  onCommnentLinkClick,
  children
}: CommentListProps) {
  const { t } = useTranslation('common_blog');
  const { locale } = useLocale();
  const ref = useRef<HTMLTableRowElement>(null);
  const isMutedByViewer = mutedList?.some((x) => x.name === comment.author);
  const isGrayedByStats = comment.stats?.gray;
  const isBlacklisted = comment.blacklists && comment.blacklists.length > 0;
  // Gray/muted comments always start collapsed/dimmed regardless of the list-level filter;
  // the filter (comment-list.tsx) only decides whether they are rendered at all.
  const isOriginallyHidden = !!(isGrayedByStats || isMutedByViewer);
  const [hiddenComment, setHiddenComment] = useState(isOriginallyHidden);
  const [openState, setOpenState] = useState<string>(isOriginallyHidden ? '' : 'item-1');
  const [tempraryHidden, setTemporaryHidden] = useState(false);
  const commentId = `@${comment.author}/${comment.permlink}`;
  const userFromGDPR = gdprUserList.some((e) => e === comment.author);
  const parentFromGDPR = gdprUserList.some((e) => e === comment.parent_author);

  useEffect(() => {
    const shouldBeHidden = !!(comment.stats?.gray || isMutedByViewer);
    setHiddenComment(shouldBeHidden);
    setOpenState(shouldBeHidden ? '' : 'item-1');
    setTemporaryHidden(!!comment.stats?.gray);
  }, [comment.stats?.gray, isMutedByViewer]);
  const currentDepth = comment.depth - parent_depth;

  const repliesText = `${comment.children} ${
    comment.children > 1 ? t('cards.comment_card.replies') : t('cards.comment_card.one_reply')
  }`;
  const toggleLabel = openState
    ? t('cards.comment_card.collapse_comment')
    : comment.children
      ? t('cards.comment_card.expand_comment_with_replies', { replies: repliesText })
      : t('cards.comment_card.expand_comment');

  if (userFromGDPR || parentFromGDPR) {
    return null;
  }
  return (
    <>
      {currentDepth < 8 ? (
        <li data-testid="comment-list-item" className="w-full min-w-0">
          <div className="flex w-full min-w-0" id={commentId} ref={ref}>
            <UserAvatarImg
              className={clsx('mr-3 hidden shrink-0 rounded-3xl sm:block', {
                'mx-[15px] h-[25px] w-[25px] opacity-50': hiddenComment,
                'h-[40px] w-[40px]': !hiddenComment,
                'opacity-50': tempraryHidden
              })}
              height="40"
              width="40"
              src={getUserAvatarUrl(comment.author, 'small')}
              alt={t('global.profile_picture_of', { username: comment.author })}
              loading="lazy"
            />
            <Accordion type="single" collapsible value={openState} className="w-full min-w-0">
              <AccordionItem className="w-full min-w-0" value="item-1">
                <Card
                  className={cn(`mb-4 w-full min-w-0 overflow-hidden bg-background text-primary depth-${comment.depth}`, {
                    'opacity-50 hover:opacity-100': hiddenComment || tempraryHidden,
                    'border border-destructive': comment._temporary,
                    'border border-blue-400/50': comment._optimistic
                  })}
                >
                  <CardHeader className="px-0 py-0">
                    <div className="flex w-full justify-between">
                      <div
                        className="flex w-full flex-col justify-start sm:flex-row sm:items-center"
                        data-testid="comment-card-header"
                      >
                        <div className="flex w-full items-center justify-between text-xs sm:text-sm">
                          <div className="my-1 flex flex-wrap items-center pl-1">
                            {comment._temporary && !comment._optimistic ? (
                              <div className="flex items-center pl-1 font-bold hover:cursor-pointer hover:text-destructive">
                                {comment.author}
                              </div>
                            ) : (
                              <>
                                {comment._optimistic && (
                                  <span className="mr-2 flex items-center gap-1 text-xs text-blue-500">
                                    <CircleSpinner size={10} color="#3b82f6" loading />
                                    {comment._confirmed ? t('global.confirmed_indexing') : t('global.publishing')}
                                  </span>
                                )}
                                <UserAvatarImg
                                  className=" h-[20px] w-[20px] rounded-3xl sm:hidden"
                                  height="20"
                                  width="20"
                                  src={getUserAvatarUrl(comment.author, 'small')}
                                  alt={t('global.profile_picture_of', { username: comment.author })}
                                  loading="lazy"
                                />
                                <UserPopoverCard
                                  author={comment.author}
                                  author_reputation={comment.author_reputation}
                                  blacklist={comment.blacklists}
                                />
                                {isLiteDid(comment.author) ? null : (
                                  <LiteAuthorBadge jsonMetadata={comment.json_metadata} />
                                )}
                                {comment.author_title ? (
                                  <Badge
                                    variant="outline"
                                    className="mr-1 border-destructive"
                                    data-testid="comment-user-affiliation-tag"
                                  >
                                    <span className="mr-1">{comment.author_title}</span>
                                    <ChangeTitleDialog
                                      permlink={parentPermlink}
                                      moderateEnabled={permissionToMute}
                                      userOnList={comment.author}
                                      title={comment.author_title ?? ''}
                                      community={comment.community ?? ''}
                                    />
                                  </Badge>
                                ) : (
                                  <ChangeTitleDialog
                                    permlink={parentPermlink}
                                    moderateEnabled={permissionToMute}
                                    userOnList={comment.author}
                                    title={comment.author_title ?? ''}
                                    community={comment.community ?? ''}
                                  />
                                )}
                                <Link
                                  href={`#@${comment.author}/${comment.permlink}`}
                                  className="hover:text-destructive md:text-sm ml-1"
                                  title={formatDateTime(comment.created, locale, 'weekdayDateYear', 'UTC')}
                                  data-testid="comment-timestamp-link"
                                  onClick={() => {
                                    onCommnentLinkClick(`#@${comment.author}/${comment.permlink}`);
                                  }}
                                >
                                  <TimeAgo date={comment.created} />
                                </Link>
                                {!comment._optimistic && (
                                  <Link
                                    className="p-1 sm:p-2"
                                    href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                                    data-testid="comment-page-link"
                                  >
                                    <Icons.link className="h-3 w-3" />
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                          {comment._temporary && !comment._optimistic ? null : !hiddenComment ? (
                            <div className="flex items-center">
                              {/* Only show flag here for non-originally-hidden comments; originally hidden ones show flag in the reveal/hide section */}
                              {!isOriginallyHidden && flagText && comment.community ? (
                                <AlertDialogFlag
                                  community={comment.community}
                                  username={comment.author}
                                  permlink={comment.permlink}
                                  flagText={flagText}
                                >
                                  <FlagTooltip onClick={() => {}} />
                                </AlertDialogFlag>
                              ) : null}
                              <AccordionTrigger
                                className="pb-0 pt-1 no-underline! sm:hidden"
                                aria-label={toggleLabel}
                                onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                              />
                            </div>
                          ) : null}
                        </div>
                        {comment._temporary && !comment._optimistic ? null : isOriginallyHidden ? (
                          <div className="flex w-full items-center justify-between">
                            <AccordionTrigger
                              className="pb-0 pt-1 no-underline! "
                              onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                            >
                              <span
                                className="ml-4 cursor-pointer text-xs sm:text-sm"
                                onClick={() => setHiddenComment(!hiddenComment)}
                              >
                                {hiddenComment
                                  ? t('cards.comment_card.reveal_comment')
                                  : t('cards.comment_card.hide_comment')}
                                {hiddenComment && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({t(getCommentMuteReasonKey(comment.stats?.muted_reasons, isMutedByViewer, isBlacklisted))})
                                  </span>
                                )}
                              </span>
                            </AccordionTrigger>
                            {/* Flag icon stays in this section for originally hidden comments */}
                            <div className="flex items-center">
                              {flagText && comment.community ? (
                                <AlertDialogFlag
                                  community={comment.community}
                                  username={comment.author}
                                  permlink={comment.permlink}
                                  flagText={flagText}
                                >
                                  <FlagTooltip onClick={() => {}} />
                                </AlertDialogFlag>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {comment._temporary && !comment._optimistic ? null : !openState ? (
                          <div
                            className="ml-4 flex h-5 items-center gap-2 text-xs sm:text-sm"
                            data-testid="comment-card-footer"
                          >
                            <VotesComponentWrapper post={comment} type="comment" />

                            <DetailsCardHover
                              post={comment}
                              decline={parseFloat(comment.max_accepted_payout) === 0}
                            >
                              <div
                                className="flex items-center hover:cursor-pointer hover:text-destructive "
                                data-testid="comment-card-footer-payout"
                              >
                                {formatDollars(comment.payout, locale)}
                              </div>
                            </DetailsCardHover>
                            {comment.children ? (
                              <>
                                <Separator orientation="vertical" />
                                <div className="flex items-center text-nowrap">{repliesText}</div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {!hiddenComment ? (
                        <AccordionTrigger
                          className="mr-2 hidden pb-0 pt-1 no-underline! sm:block"
                          aria-label={toggleLabel}
                          onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                        />
                      ) : null}
                    </div>
                  </CardHeader>
                  <AccordionContent className="h-fit p-0">
                    <CommentListItemContent
                      comment={comment}
                      permissionToMute={permissionToMute}
                      parentPermlink={parentPermlink}
                      parentAuthor={parentAuthor}
                      discussionAuthor={discussionAuthor}
                      discussionPermlink={discussionPermlink}
                      observer={observer}
                    />
                  </AccordionContent>
                </Card>
                {/* Children rendered without AccordionContent so replies are always visible even when parent is hidden */}
                {children ? <div className="h-fit p-0">{children}</div> : null}
              </AccordionItem>
            </Accordion>
          </div>
        </li>
      ) : currentDepth === 8 ? (
        <div className="h-8">
          <Link
            href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
            className="text-destructive"
          >
            {t('cards.comment_card.load_more')}...
          </Link>
        </div>
      ) : null}
    </>
  );
});

export default CommentListItem;
