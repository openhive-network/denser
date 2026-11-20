'use client';

import { memo, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { CardContent, CardDescription, CardFooter } from '@hive/ui/components/card';
import { Separator } from '@ui/components/separator';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { handleError } from '@ui/lib/handle-error';
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { selectIsLoggedIn, selectUsername, useUserSelect } from '@smart-signer/lib/auth/use-user-select';
import { useTranslation } from '@/blog/i18n/client';
import { ReplyTextbox } from '../post-editor/reply-textbox';
import LiteReplyTrigger from '../lite-account/lite-reply-trigger';
import { LiteOwnerActions } from '../lite-account/lite-owner-actions';
import { liteL1Author } from '../lite-account/lite-ownership';
import { LiteTombstoneNotice } from '../lite-account/lite-tombstone-notice';
import { useIsLiteTombstone } from '../lite-account/use-lite-owner';
import { useReopenReplyAfterSignIn } from '../lite-account/use-lite-sign-in-handoff';
import { commentClassName } from './comment-class-name';
import { CommentFooterStats } from './comment-footer-stats';
import { PostDeleteDialog } from './post-delete-dialog';
import RendererContainer from './rendererContainer';
import { useDeleteCommentMutation } from './hooks/use-comment-mutations';
import MutePostDialog from './mute-post-dialog';

// The lite editor pulls in the post editor's helpers (and the renderer); load it only when editing.
const LiteEditForm = dynamic(() => import('../lite-account/lite-edit-form').then((m) => m.LiteEditForm), { ssr: false });
// The guest reply box signs with @hiveio/lite-account's crypto; load it only when a guest opens a reply.
const LiteReplyBox = dynamic(() => import('../lite-account/lite-reply-box').then((m) => m.LiteReplyBox), { ssr: false });

interface CommentListItemContentProps {
  comment: Entry;
  permissionToMute: Boolean;
  parentPermlink: string;
  parentAuthor: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
}

/**
 * A comment's body, footer actions and reply box: the part of the comment that depends on the
 * signed-in user. Applying the stored user after hydration re-renders this, not the comment's
 * header and frame.
 */
const CommentListItemContent = memo(function CommentListItemContent({
  comment,
  permissionToMute,
  parentPermlink,
  parentAuthor,
  discussionAuthor,
  discussionPermlink,
  observer
}: CommentListItemContentProps) {
  const { t } = useTranslation('common_blog');
  const isLoggedIn = useUserSelect(selectIsLoggedIn);
  const username = useUserSelect(selectUsername);

  // Build storage keys only when user is logged in (empty string disables hook)
  const replyStorageId = isLoggedIn
    ? `replybox-/${comment.author}/${comment.permlink}-${username}`
    : '';
  const editStorageId = isLoggedIn
    ? `editbox-/${comment.author}/${comment.permlink}-${username}`
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

  // Guests have no storage key (empty replyStorageId disables the hook), so the lite
  // reply box keeps its open/closed state in memory instead.
  const [guestReply, setGuestReply] = useState(false);
  const [liteEdit, setLiteEdit] = useState(false);
  const liteTombstone = useIsLiteTombstone(comment);

  // Wrapper to match expected interface and handle storage
  const setReply = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (!isLoggedIn) {
        setGuestReply(value);
      } else if (typeof value === 'function') {
        setStoredReply((prev) => value(prev));
      } else if (value) {
        setStoredReply(true);
      } else {
        removeStoredReply();
      }
    },
    [isLoggedIn, setStoredReply, removeStoredReply]
  );

  const openReply = useCallback(() => setReply(true), [setReply]);
  useReopenReplyAfterSignIn(comment.author, comment.permlink, isLoggedIn, openReply);

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
  const reply = isLoggedIn ? storedReply : guestReply;
  const edit = storedEdit;
  const userFromDMCA = dmcaUserList.some((e) => e === comment.author);
  const legalBlockedUser = userIllegalContent.some((e) => e === comment.author);

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

  return (
    <>
      <Separator orientation="horizontal" />
      <CardContent className="h-fit w-full min-w-0 overflow-hidden px-[5px] py-px hover:bg-background-tertiary" data-testid="comment-card-to-hover">
        {legalBlockedUser ? (
          <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
        ) : userFromDMCA ? (
          <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
        ) : liteEdit && !isLoggedIn ? (
          <LiteEditForm
            entry={comment}
            onClose={() => setLiteEdit(false)}
            discussionAuthor={discussionAuthor}
            discussionPermlink={discussionPermlink}
            observer={observer}
          />
        ) : liteTombstone ? (
          <LiteTombstoneNotice />
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
            <CommentFooterStats comment={comment} />
            {isLoggedIn ? (
              <button
                disabled={deleteCommentMutation.isPending}
                onClick={() => setReply(!reply)}
                className="flex items-center hover:cursor-pointer hover:text-destructive"
                data-testid="comment-card-footer-reply"
              >
                {t('cards.comment_card.reply')}
              </button>
            ) : (
              <LiteReplyTrigger
                open={reply}
                onToggle={() => setReply(!reply)}
                className="flex items-center hover:cursor-pointer hover:text-destructive"
                testId="comment-card-footer-reply"
              >
                {t('post_content.footer.reply')}
              </LiteReplyTrigger>
            )}
            {!isLoggedIn ? (
              <LiteOwnerActions
                entry={comment}
                editing={liteEdit}
                onToggleEdit={() => setLiteEdit((prev) => !prev)}
                separator={<Separator orientation="vertical" className="h-5" />}
                className="flex items-center hover:cursor-pointer hover:text-destructive"
                discussionAuthor={discussionAuthor}
                discussionPermlink={discussionPermlink}
                observer={observer}
              />
            ) : null}
            {isLoggedIn && comment.author === username ? (
              <>
                <Separator orientation="vertical" className="h-5" />
                <button
                  disabled={deleteCommentMutation.isPending}
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
            isLoggedIn &&
            comment.author === username &&
            new Date() < new Date(`${comment.payout_at}Z`) ? (
              <>
                <Separator orientation="vertical" className="h-5" />
                <PostDeleteDialog
                  permlink={comment.permlink}
                  action={dialogAction}
                  kind="comment"
                >
                  <button
                    disabled={edit || deleteCommentMutation.isPending}
                    className="flex items-center hover:cursor-pointer hover:text-destructive"
                    data-testid="comment-card-footer-delete"
                  >
                    {deleteCommentMutation.isPending ? (
                      <CircleSpinner
                        loading={deleteCommentMutation.isPending}
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
      {reply && !isLoggedIn ? (
        <div className="px-2 pb-2">
          <LiteReplyBox
            parentAuthor={comment.author}
            l1ParentAuthor={liteL1Author(comment)}
            parentPermlink={comment.permlink}
            discussionAuthor={discussionAuthor}
            discussionPermlink={discussionPermlink}
            observer={observer}
            onSetReply={setReply}
          />
        </div>
      ) : null}
      {reply && isLoggedIn ? (
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
    </>
  );
});

export default CommentListItemContent;
