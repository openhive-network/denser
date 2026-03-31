import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { Icons } from '@ui/components/icons';
import dynamic from 'next/dynamic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { CircleSpinner } from 'react-spinners-kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@hive/ui/components/alert-dialog';
import { Progress } from '@ui/components/progress';
import { Separator } from '@ui/components';

import { DEFAULT_PREFERENCES, hoursAndMinutes, Preferences } from '@/blog/lib/utils';
import { Entry } from '@hive/common-hiveio-packages/wax';
import RendererContainer from '../post-rendering/rendererContainer';
import { getLogger } from '@ui/lib/logging';
import { useCommentMutation, useUpdateCommentMutation } from '../post-rendering/hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { commentClassName } from '../post-rendering/comment-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getStorageItem, removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { useLoggedUserContext } from '@/blog/features/votes/hooks/use-logged-user';

const MdEditor = dynamic(() => import('./md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

const logger = getLogger('app');

export function ReplyTextbox({
  onSetReply,
  username,
  permlink,
  parentPermlink,
  storageId,
  editMode,
  comment,
  discussionAuthor,
  discussionPermlink,
  observer
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
  parentPermlink?: string;
  storageId: string;
  editMode: boolean;
  comment: Entry | string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
}) {
  const { user } = useUserClient();
  // Use empty string when user is not logged in to disable storage
  // Different storage keys for reply vs edit mode
  const replyStorageKey = useMemo(
    () => (user.username ? `replyTo-/${username}/${permlink}-${user.username}` : ''),
    [username, permlink, user.username]
  );
  const editStorageKey = useMemo(
    () => (user.username && editMode ? `editDraft-/${username}/${permlink}-${user.username}` : ''),
    [username, permlink, user.username, editMode]
  );
  // Use the appropriate key based on mode
  const storageKey = editMode ? editStorageKey : replyStorageKey;

  // Get the original comment body (works for both Entry object and string)
  const commentBody = typeof comment === 'string' ? comment : (comment?.body ?? '');

  // User preferences are permanent (no TTL) - use empty key when not logged in
  const [preferences] = useStorageWithTTL<Preferences>(
    user.username ? `user-preferences-${user.username}` : '',
    DEFAULT_PREFERENCES,
    StorageTTL.PERMANENT
  );
  const { t } = useTranslation('common_blog');

  // Use hook for draft storage - provides cross-tab sync and SSR safety
  // Both reply and edit modes now use storage (with different keys)
  const [storedDraft, setStoredDraft, removeStoredDraft] = useStorageWithTTL<string>(
    storageKey,
    '',
    StorageTTL.DRAFT
  );

  // Calculate initial text value:
  // - In edit mode: use commentBody (the original content to edit)
  // - In reply mode: start empty
  // Note: storedDraft from localStorage will be applied via useEffect after hydration
  const initialText = editMode ? commentBody : '';

  const [text, setText] = useState(initialText);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Track what value we last synced from storage (for cross-tab detection)
  const lastSyncedDraftRef = useRef<string>('');

  // Get the logged-in user's reputation and manabars from context (fetched once via LoggedUserProvider)
  const { reputation, manabarsData } = useLoggedUserContext();

  const commentMutation = useCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply stored draft after hydration (overrides initial text if draft exists)
  // Also handles cross-tab sync when storedDraft changes
  useEffect(() => {
    if (lastSyncedDraftRef.current !== storedDraft) {
      if (storedDraft) {
        // There's a draft in storage - use it (takes priority over initial text)
        setText(storedDraft);
      } else if (editMode && lastSyncedDraftRef.current) {
        // Draft was cleared (e.g., from another tab) - revert to original in edit mode
        setText(commentBody);
      }
      lastSyncedDraftRef.current = storedDraft;
    }
  }, [storedDraft, editMode, commentBody]);

  // Shadow reply recovery — check for orphaned shadow draft from crashed session
  const [shadowReplyRecovery, setShadowReplyRecovery] = useState<{
    key: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (editMode || !user.username) return;
    const shadowKey = `shadow-reply-${user.username}-${username}-${permlink}`;
    const item = getStorageItem<{ body: string; parentAuthor: string; parentPermlink: string }>(shadowKey);
    if (item) {
      setShadowReplyRecovery({ key: shadowKey, body: item.body });
    }
  }, [user.username, username, permlink, editMode]);

  // Debounced save to localStorage (works for both reply and edit modes)
  const saveToStorage = useCallback(
    (value: string) => {
      if (!storageKey) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        // In edit mode, only save if different from original
        // In reply mode, save any non-empty value
        if (editMode) {
          if (value && value !== commentBody) {
            setStoredDraft(value);
          } else {
            // If same as original or empty, remove draft
            removeStoredDraft();
          }
        } else {
          if (value) {
            setStoredDraft(value);
          } else {
            removeStoredDraft();
          }
        }
      }, 500);
    },
    [storageKey, editMode, commentBody, setStoredDraft, removeStoredDraft]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const removePost = useCallback(() => {
    if (storageKey) {
      removeStoredDraft();
    }
  }, [storageKey, removeStoredDraft]);

  const handleCancel = () => {
    // Always remove the reply box state
    removeStorageItem(storageId);

    // Check if there are unsaved changes
    const hasChanges = editMode ? text !== commentBody : text !== '';

    if (!hasChanges) {
      // No changes to save, just close and cleanup any existing draft
      removePost();
      onSetReply(false);
      return;
    }

    // Ask user to confirm discarding their draft
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    removePost();
    onSetReply(false);
    setCancelDialogOpen(false);
  };

  const postComment = async () => {
    try {
      if (btnRef.current) {
        btnRef.current.disabled = true;
      }
      if (parentPermlink && typeof comment !== 'string') {
        const payout =
          comment.max_accepted_payout === '0.000 HBD' ? '0%' : comment.percent_hbd === 0 ? '100%' : '50%';
        const updateCommentParams = {
          parentAuthor: username,
          parentPermlink,
          permlink,
          body: text,
          discussionAuthor,
          discussionPermlink,
          observer
        };
        try {
          await updateCommentMutation.mutateAsync(updateCommentParams);
        } catch (error) {
          handleError(error, { method: 'updateComment', params: updateCommentParams });
          throw error;
        }
      } else {
        const commentParams = {
          parentAuthor: username,
          parentPermlink: permlink,
          body: text,
          preferences,
          reputation,
          discussionAuthor,
          discussionPermlink,
          observer
        };
        try {
          await commentMutation.mutateAsync(commentParams);
        } catch (error) {
          handleError(error, { method: 'comment', params: commentParams });
          throw error;
        }
      }
      setText('');
      removePost(); // Remove stored comment text
      removeStorageItem(storageId); // Remove reply box state
      onSetReply(false);
      if (btnRef.current) {
        btnRef.current.disabled = true;
      }
    } catch (error) {
      if (btnRef.current) {
        btnRef.current.disabled = false;
      }
      logger.error(error);
    }
  };

  return (
    <div
      className="mb-4 flex w-full flex-col gap-4 rounded-lg border border-border bg-background p-4 text-primary shadow-sm"
      data-testid="reply-editor"
      suppressHydrationWarning
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-md bg-background-secondary px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {editMode ? t('post_content.footer.comment.editing') : t('post_content.footer.comment.replying')}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleCancel()}
          >
            {t('post_content.footer.comment.disable_editor')}
          </Button>
        </div>

        {shadowReplyRecovery && (
          <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-900/20">
            <span className="text-foreground/80">{t('post_content.footer.comment.shadow_draft_found')}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => {
                  setText(shadowReplyRecovery.body);
                  saveToStorage(shadowReplyRecovery.body);
                  removeStorageItem(shadowReplyRecovery.key);
                  setShadowReplyRecovery(null);
                }}
              >
                {t('post_content.footer.comment.shadow_draft_recover')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => {
                  removeStorageItem(shadowReplyRecovery.key);
                  setShadowReplyRecovery(null);
                }}
              >
                {t('post_content.footer.comment.shadow_draft_discard')}
              </Button>
            </div>
          </div>
        )}

        <div>
          <MdEditor
            windowheight={200}
            onChange={(value) => {
              setText(value);
              saveToStorage(value);
            }}
            persistedValue={text}
            placeholder={t('post_content.footer.comment.reply')}
          />
          <div className="flex items-center rounded-b-md border-x border-b border-border bg-background-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
            {t('post_content.footer.comment.insert_images')} {t('post_content.footer.comment.selecting_them')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Icons.info className="ml-1 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('submit_page.insert_images_info')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              ref={btnRef}
              variant="redHover"
              className="w-24"
              disabled={text === '' || commentMutation.isLoading || updateCommentMutation.isLoading}
              onClick={() => postComment()}
            >
              {commentMutation.isLoading || updateCommentMutation.isLoading ? (
                <CircleSpinner
                  loading={commentMutation.isLoading || updateCommentMutation.isLoading}
                  size={18}
                  color="#dc2626"
                />
              ) : (
                t('post_content.footer.comment.post')
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={commentMutation.isLoading || updateCommentMutation.isLoading}
              onClick={() => handleCancel()}
              className="text-foreground/60 hover:text-destructive"
            >
              {t('post_content.footer.comment.cancel')}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Progress
              value={manabarsData?.rc.percentageValue ?? 0}
              className="h-2 w-20"
              indicatorClassName="bg-[#0088FE]"
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              {manabarsData?.rc.percentageValue ?? 0}% RC
              {manabarsData?.rc.percentageValue !== 100 && manabarsData?.rc.cooldown ? (
                <span className="ml-1 text-muted-foreground/60">
                  ({hoursAndMinutes(manabarsData.rc.cooldown, t)})
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col">
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-background-secondary/50 px-3 py-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('post_content.footer.comment.preview')}
          </span>
          <div className="flex items-center gap-3 text-xs">
            {editMode || preferences.comment_rewards === '50%' ? null : (
              <span className="text-muted-foreground">
                {t('post_content.footer.comment.rewards')}
                {preferences.comment_rewards === '0%'
                  ? t('post_content.footer.comment.decline_payout')
                  : t('post_content.footer.comment.power_up')}{' '}
                <Link className="text-destructive hover:underline" href={`/@${user.username}/settings`}>
                  {t('post_content.footer.comment.update_settings')}
                </Link>
              </span>
            )}
            <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
              <span className="text-muted-foreground hover:text-destructive transition-colors">
                {t('post_content.footer.comment.markdown_styling_guide')}
              </span>
            </Link>
          </div>
        </div>
        <div className="rounded-b-lg border border-border">
          {text ? (
            <RendererContainer
              body={text}
              author=""
              previewMode
              className={commentClassName + ' max-w-full p-3'}
            />
          ) : (
            <div className="flex w-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
              <Icons.eye className="h-6 w-6 opacity-20" />
              <span className="text-xs">{t('submit_page.preview_placeholder')}</span>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('post_content.footer.comment.exit_editor')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('post_content.footer.comment.exit_editor_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('post_content.footer.comment.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('post_content.footer.comment.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
