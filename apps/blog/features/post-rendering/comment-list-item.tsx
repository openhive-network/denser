'use client';

import { Icons } from '@hive/ui/components/icons';
import parseDate from '@hive/ui/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@hive/ui/components/card';
import { cn } from '@hive/ui/lib/utils';
import { Link } from '@hive/ui';
import { Separator } from '@ui/components/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { memo, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import DetailsCardVoters from '@/blog/features/post-rendering/details-card-voters';
import { ReplyTextbox } from '../post-editor/reply-textbox';
import DetailsCardHover from '../list-of-posts/details-card-hover';
import { IFollowList, Entry } from '@hive/common-hiveio-packages/wax';
import clsx from 'clsx';
import { Badge } from '@ui/components/badge';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DialogLogin from '../../components/dialog-login';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';

import { PostDeleteDialog } from './post-delete-dialog';
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import RendererContainer from './rendererContainer';
import { useDeleteCommentMutation } from './hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import MutePostDialog from './mute-post-dialog';
import ChangeTitleDialog from '../community-profile/change-title-dialog';
import { AlertDialogFlag } from './alert-window-flag';
import FlagTooltip from './flag-icon';
import TimeAgo from '@hive/ui/components/time-ago';
import { getUserAvatarUrl } from '@hive/ui';
import { UserPopoverCard } from './user-popover-card';
import { useTranslation } from '@/blog/i18n/client';
import VotesComponentWrapper from '@/blog/features/votes/votes-component-wrapper';
import { getCommentMuteReasonKey } from '@/blog/lib/muted-reasons';

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
  filteringEnabled?: boolean;
  onCommnentLinkClick: (hash: string) => void;
  children?: ReactNode;
}
export const commentClassName =
  'font-sanspro text-[12.5px] prose-h1:text-[20px] prose-h2:text-[17.5px] prose-h4:text-[13.7px] sm:text-[13.4px] sm:prose-h1:text-[21.5px] sm:prose-h2:text-[18.7px] sm:prose-h3:text-[16px]  sm:prose-h4:text-[14.7px] lg:text-[14.6px] lg:prose-h1:text-[23.3px] lg:prose-h2:text-[20.4px] lg:prose-h3:text-[17.5px] lg:prose-h4:text-[16px] prose-h3:text-[15px] prose-p:mb-[9.6px] prose-p:mt-[1.6px] last:prose-p:mb-[3.2px] prose-img:max-w-full prose-img:h-auto prose-img:max-h-[400px]';

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
  filteringEnabled = true,
  onCommnentLinkClick,
  children
}: CommentListProps) {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const ref = useRef<HTMLTableRowElement>(null);
  const isMutedByViewer = mutedList?.some((x) => x.name === comment.author);
  const isGrayedByStats = comment.stats?.gray;
  const isBlacklisted = comment.blacklists && comment.blacklists.length > 0;
  const isOriginallyHidden = filteringEnabled && (isGrayedByStats || isMutedByViewer);
  const [hiddenComment, setHiddenComment] = useState(isOriginallyHidden);
  const [openState, setOpenState] = useState<string>(isOriginallyHidden ? '' : 'item-1');
  const [tempraryHidden, setTemporaryHidden] = useState(false);
  const commentId = `@${comment.author}/${comment.permlink}`;

  // Build storage keys only when user is logged in (empty string disables hook)
  const replyStorageId = user.isLoggedIn
    ? `replybox-/${comment.author}/${comment.permlink}-${user.username}`
    : '';
  const editStorageId = user.isLoggedIn
    ? `editbox-/${comment.author}/${comment.permlink}-${user.username}`
    : '';

  // Use hooks for reply and edit state - provides cross-tab sync and automatic TTL
  const [storedReply, setStoredReply, removeStoredReply] = useStorageWithTTL<boolean>(
    replyStorageId,
    false,
    StorageTTL.UI_STATE
  );
  const [storedEdit, setStoredEdit, removeStoredEdit] = useStorageWithTTL<boolean>(
    editStorageId,
    false,
    StorageTTL.UI_STATE
  );

  // Wrapper to match expected interface and handle storage
  const setReply = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        setStoredReply((prev) => value(prev));
      } else if (value) {
        setStoredReply(true);
      } else {
        removeStoredReply();
      }
    },
    [setStoredReply, removeStoredReply]
  );

  const setEdit = useCallback(
    (value: boolean) => {
      if (value) {
        setStoredEdit(true);
      } else {
        removeStoredEdit();
      }
    },
    [setStoredEdit, removeStoredEdit]
  );

  // Use stored values directly as state
  const reply = storedReply;
  const edit = storedEdit;
  const userFromDMCA = dmcaUserList.some((e) => e === comment.author);
  const legalBlockedUser = userIllegalContent.some((e) => e === comment.author);
  const userFromGDPR = gdprUserList.some((e) => e === comment.author);
  const parentFromGDPR = gdprUserList.some((e) => e === comment.parent_author);

  useEffect(() => {
    const shouldBeHidden = filteringEnabled && !!(comment.stats?.gray || isMutedByViewer);
    setHiddenComment(shouldBeHidden);
    setOpenState(shouldBeHidden ? '' : 'item-1');
    setTemporaryHidden(filteringEnabled && !!comment.stats?.gray);
  }, [comment.stats?.gray, isMutedByViewer, filteringEnabled]);
  const currentDepth = comment.depth - parent_depth;

  const deleteCommentMutation = useDeleteCommentMutation();
  const deleteComment = async (permlink: string) => {
    try {
      await deleteCommentMutation.mutateAsync({ permlink, discussionAuthor, discussionPermlink, observer });
    } catch (error) {
      handleError(error, { method: 'deleteComment', params: { permlink } });
    }
  };

  // Receive output from dialog and do action according to user's
  // response.
  const dialogAction = (permlink: string): void => {
    if (permlink) {
      deleteComment(permlink);
    }
  };

  if (userFromGDPR || parentFromGDPR) {
    return null;
  }
  return (
    <>
      {currentDepth < 8 ? (
        <li data-testid="comment-list-item" className="w-full min-w-0">
          <div className="flex w-full min-w-0" id={commentId} ref={ref}>
            <img
              className={clsx('mr-3 hidden shrink-0 rounded-3xl sm:block', {
                'mx-[15px] h-[25px] w-[25px] opacity-50': hiddenComment,
                'h-[40px] w-[40px]': !hiddenComment,
                'opacity-50': tempraryHidden
              })}
              height="40"
              width="40"
              src={getUserAvatarUrl(comment.author, 'small')}
              alt={`${comment.author} profile picture`}
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
                                    {t('global.publishing')}
                                  </span>
                                )}
                                <img
                                  className=" h-[20px] w-[20px] rounded-3xl sm:hidden"
                                  height="20"
                                  width="20"
                                  src={getUserAvatarUrl(comment.author, 'small')}
                                  alt={`${comment.author} profile picture`}
                                  loading="lazy"
                                />
                                <UserPopoverCard
                                  author={comment.author}
                                  author_reputation={comment.author_reputation}
                                  blacklist={comment.blacklists}
                                />
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
                                  title={String(parseDate(comment.created))}
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
                              {!isOriginallyHidden && flagText && comment.community && !user.isLoggedIn ? (
                                <DialogLogin>
                                  <FlagTooltip onClick={() => {}} />
                                </DialogLogin>
                              ) : !isOriginallyHidden && flagText && comment.community && user.isLoggedIn ? (
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
                                className="pb-0 pt-1 !no-underline sm:hidden"
                                onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                              />
                            </div>
                          ) : null}
                        </div>
                        {comment._temporary && !comment._optimistic ? null : isOriginallyHidden ? (
                          <div className="flex w-full items-center justify-between">
                            <AccordionTrigger
                              className="pb-0 pt-1 !no-underline "
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
                              {flagText && comment.community && !user.isLoggedIn ? (
                                <DialogLogin>
                                  <FlagTooltip onClick={() => {}} />
                                </DialogLogin>
                              ) : flagText && comment.community && user.isLoggedIn ? (
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
                              <div className="flex items-center hover:cursor-pointer hover:text-destructive ">
                                {'$'}
                                {comment.payout.toFixed(2)}
                              </div>
                            </DetailsCardHover>
                            {comment.children ? (
                              <>
                                <Separator orientation="vertical" />
                                <div className="flex items-center text-nowrap">
                                  {comment.children}{' '}
                                  {comment.children > 1
                                    ? t('cards.comment_card.replies')
                                    : t('cards.comment_card.one_reply')}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {!hiddenComment ? (
                        <AccordionTrigger
                          className="mr-2 hidden pb-0 pt-1 !no-underline sm:block"
                          onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                        />
                      ) : null}
                    </div>
                  </CardHeader>
                  <AccordionContent className="h-fit p-0">
                    <Separator orientation="horizontal" />
                    <CardContent className="h-fit w-full min-w-0 overflow-hidden px-[5px] py-[1px] hover:bg-background-tertiary" data-testid="comment-card-to-hover">
                      {legalBlockedUser ? (
                        <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
                      ) : userFromDMCA ? (
                        <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
                      ) : edit && comment.parent_permlink && comment.parent_author ? (
                        <ReplyTextbox
                          editMode={edit}
                          onSetReply={setEdit}
                          username={comment.parent_author}
                          permlink={comment.permlink}
                          parentPermlink={comment.parent_permlink}
                          storageId={editStorageId}
                          comment={comment}
                          discussionAuthor={discussionAuthor}
                          discussionPermlink={discussionPermlink}
                          observer={observer}
                        />
                      ) : (
                        <CardDescription data-testid="comment-card-description">
                          <RendererContainer
                            body={comment.body}
                            author={comment.author}
                            permlink={comment.permlink}
                            className={commentClassName}
                          />
                        </CardDescription>
                      )}
                    </CardContent>
                    <Separator orientation="horizontal" />{' '}
                    <CardFooter className="px-2 py-1">
                      {comment._temporary && !comment._optimistic ? null : (
                        <div
                          className="flex items-center gap-2 pt-1 text-xs sm:text-sm"
                          data-testid="comment-card-footer"
                        >
                          <VotesComponentWrapper post={comment} type="comment" />
                          <DetailsCardHover
                            post={comment}
                            decline={parseFloat(comment.max_accepted_payout) === 0}
                          >
                            <div
                              data-testid="comment-card-footer-payout"
                              className={clsx(
                                'flex items-center hover:cursor-pointer hover:text-destructive',
                                {
                                  'line-through opacity-50':
                                    parseFloat(comment.max_accepted_payout) === 0
                                }
                              )}
                            >
                              {'$'}
                              {comment.payout.toFixed(2)}
                            </div>
                          </DetailsCardHover>
                          <Separator orientation="vertical" className="h-5" />
                          {!!comment.stats && comment.stats.total_votes > 0 ? (
                            <>
                              <div className="flex items-center">
                                <DetailsCardVoters post={comment}>
                                  <span className="hover:text-destructive">
                                    {!!comment.stats && comment.stats.total_votes > 1
                                      ? t('cards.post_card.votes', { votes: comment.stats.total_votes })
                                      : t('cards.post_card.vote')}
                                  </span>
                                </DetailsCardVoters>
                              </div>
                              <Separator orientation="vertical" className="h-5" />
                            </>
                          ) : null}
                          {user.isLoggedIn ? (
                            <button
                              disabled={deleteCommentMutation.isLoading}
                              onClick={() => setReply(!reply)}
                              className="flex items-center hover:cursor-pointer hover:text-destructive"
                              data-testid="comment-card-footer-reply"
                            >
                              {t('cards.comment_card.reply')}
                            </button>
                          ) : (
                            <DialogLogin>
                              <button
                                className="flex items-center hover:cursor-pointer hover:text-destructive"
                                data-testid="comment-card-footer-reply"
                              >
                                {t('post_content.footer.reply')}
                              </button>
                            </DialogLogin>
                          )}
                          {user && user.isLoggedIn && comment.author === user.username ? (
                            <>
                              <Separator orientation="vertical" className="h-5" />
                              <button
                                disabled={deleteCommentMutation.isLoading}
                                onClick={() => {
                                  setEdit(!edit);
                                }}
                                className="flex items-center hover:cursor-pointer hover:text-destructive"
                                data-testid="comment-card-footer-edit"
                              >
                                {t('cards.comment_card.edit')}
                              </button>
                            </>
                          ) : null}
                          {comment.replies.length === 0 &&
                          user.isLoggedIn &&
                          comment.author === user.username &&
                          new Date() < new Date(`${comment.payout_at}Z`) ? (
                            <>
                              <Separator orientation="vertical" className="h-5" />
                              <PostDeleteDialog
                                permlink={comment.permlink}
                                action={dialogAction}
                                label="Comment"
                              >
                                <button
                                  disabled={edit || deleteCommentMutation.isLoading}
                                  className="flex items-center hover:cursor-pointer hover:text-destructive"
                                  data-testid="comment-card-footer-delete"
                                >
                                  {deleteCommentMutation.isLoading ? (
                                    <CircleSpinner
                                      loading={deleteCommentMutation.isLoading}
                                      size={18}
                                      color="#dc2626"
                                    />
                                  ) : (
                                    t('cards.comment_card.delete')
                                  )}
                                </button>
                              </PostDeleteDialog>
                            </>
                          ) : null}
                          {permissionToMute ? (
                            <MutePostDialog
                              comment={true}
                              community={comment.community ?? ''}
                              username={comment.author}
                              permlink={comment.permlink}
                              contentMuted={comment.stats?.gray ?? false}
                              discussionPermlink={parentPermlink}
                              discussionAuthor={parentAuthor}
                              temporaryDisable={comment.stats?._temporary}
                            />
                          ) : null}
                        </div>
                      )}
                    </CardFooter>
                    {reply && user && user.isLoggedIn ? (
                      <div className="px-2 pb-2">
                        <ReplyTextbox
                          editMode={false}
                          onSetReply={setReply}
                          username={comment.author}
                          permlink={comment.permlink}
                          storageId={replyStorageId}
                          comment=""
                          discussionAuthor={discussionAuthor}
                          discussionPermlink={discussionPermlink}
                          observer={observer}
                        />
                      </div>
                    ) : null}
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
