import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { Icons } from '@ui/components/icons';
import MdEditor from './md-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import useManabars from '../../components/hooks/use-manabars';
import { DEFAULT_PREFERENCES, hoursAndMinutes, Preferences } from '@/blog/lib/utils';
import { Entry } from '@hive/common-hiveio-packages/wax';
import RendererContainer from '../post-rendering/rendererContainer';
import { getLogger } from '@ui/lib/logging';
import { useCommentMutation, useUpdateCommentMutation } from '../post-rendering/hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { commentClassName } from '../post-rendering/comment-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { removeStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';

const logger = getLogger('app');

export function ReplyTextbox({
  onSetReply,
  username,
  permlink,
  parentPermlink,
  storageId,
  editMode,
  comment,
  discussionPermlink
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
  parentPermlink?: string;
  storageId: string;
  editMode: boolean;
  comment: Entry | string;
  discussionPermlink: string;
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

  const { manabarsData } = useManabars(user.username);
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

  // Track what value we last synced from storage (for cross-tab detection)
  const lastSyncedDraftRef = useRef<string>('');

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
    const confirmed = confirm(t('post_content.footer.comment.exit_editor'));
    if (confirmed) {
      removePost();
      onSetReply(false);
    }
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
          discussionPermlink
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
          discussionPermlink
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
        btnRef.current.disabled = true;
      }
      logger.error(error);
    }
  };

  return (
    <div
      className="mb-4 flex w-full flex-col gap-6 rounded-md border bg-background-secondary p-4 text-primary shadow-sm"
      data-testid="reply-editor"
      suppressHydrationWarning
    >
      <div className="flex flex-col gap-4">
        <Link href={`#`}>
          <h1 className="text-sm text-destructive">{t('post_content.footer.comment.disable_editor')}</h1>
        </Link>
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
          <p className="flex items-center border-2 border-t-0 border-background-tertiary bg-background-secondary/70 p-1 text-xs font-light">
            {t('post_content.footer.comment.insert_images')} {t('post_content.footer.comment.selecting_them')}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Icons.info className="ml-1 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('submit_page.insert_images_info')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span>{t('post_content.footer.comment.account_stats')}</span>
          <span className="text-xs">
            {t('post_content.footer.comment.resource_credits', { value: manabarsData?.rc.percentageValue })}{' '}
            {manabarsData?.rc.percentageValue !== 100 && manabarsData?.rc.cooldown ? (
              <span>
                {t('post_content.footer.comment.full_in')}
                {hoursAndMinutes(manabarsData.rc.cooldown, t)}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-col md:flex-row">
          <Button
            ref={btnRef}
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
            className="font-thiny hover:text-destructive"
          >
            {t('post_content.footer.comment.cancel')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{t('post_content.footer.comment.preview')}</span>
          <div className="flex flex-col gap-1 text-end">
            {editMode || preferences.comment_rewards === '50%' ? null : (
              <div>
                {t('post_content.footer.comment.rewards')}
                {preferences.comment_rewards === '0%'
                  ? t('post_content.footer.comment.decline_payout')
                  : t('post_content.footer.comment.power_up')}{' '}
                <Link className="text-destructive" href={`/@${user.username}/settings`}>
                  {t('post_content.footer.comment.update_settings')}
                </Link>
              </div>
            )}
            <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
              <span className="text-destructive">
                {t('post_content.footer.comment.markdown_styling_guide')}
              </span>
            </Link>
          </div>
        </div>
        <RendererContainer
          body={text}
          author=""
          className={commentClassName + ' max-w-full border-2 border-background-tertiary p-2'}
        />
      </div>
    </div>
  );
}
