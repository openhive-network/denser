import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { useLocalStorage } from 'usehooks-ts';
import { Icons } from '@ui/components/icons';
import MdEditor from './md-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import useManabars from '../../components/hooks/use-manabars';
import { DEFAULT_PREFERENCES, hoursAndMinutes, Preferences } from '@/blog/lib/utils';
import { Entry } from '@transaction/lib/extended-hive.chain';
import RendererContainer from '../post-rendering/rendererContainer';
import { getLogger } from '@ui/lib/logging';
import { useCommentMutation, useUpdateCommentMutation } from '../post-rendering/hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { commentClassName } from '../post-rendering/comment-list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const logger = getLogger('app');

// Comment draft storage with expiration (1 month)
const COMMENT_DRAFT_PREFIX = 'replyTo-';
const COMMENT_DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CommentDraft {
  text: string;
  expiresAt: number;
}

function saveCommentDraft(key: string, text: string): void {
  const draft: CommentDraft = {
    text,
    expiresAt: Date.now() + COMMENT_DRAFT_EXPIRY_MS
  };
  localStorage.setItem(key, JSON.stringify(draft));
}

function loadCommentDraft(key: string): string | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    // Handle legacy format (just string)
    if (typeof parsed === 'string') {
      return parsed;
    }
    // New format with expiration
    const draft = parsed as CommentDraft;
    if (draft.expiresAt && Date.now() > draft.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return draft.text;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function cleanupExpiredCommentDrafts(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(COMMENT_DRAFT_PREFIX)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Check if it's the new format with expiration
          if (typeof parsed === 'object' && parsed.expiresAt) {
            if (Date.now() > parsed.expiresAt) {
              keysToRemove.push(key);
            }
          }
          // Legacy format without expiration - convert or remove if very old
          // We can't know the age, so we leave them for now
        } catch {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

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
  const storageKey = useMemo(
    () => (user.username ? `replyTo-/${username}/${permlink}-${user.username}` : null),
    [username, permlink, user.username]
  );

  // Memoize comment body to avoid recalculation on every render
  const commentBody = useMemo(
    () => (typeof comment === 'string' ? comment : (comment?.body ?? '')),
    [comment]
  );

  const { manabarsData } = useManabars(user.username);
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { t } = useTranslation('common_blog');

  // Initialize with empty string to avoid hydration mismatch, then hydrate from localStorage
  const [text, setText] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const commentMutation = useCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate text from localStorage or comment body after mount
  // Also cleanup expired drafts on first mount
  useEffect(() => {
    if (!isHydrated && storageKey) {
      // Cleanup expired drafts on component mount
      cleanupExpiredCommentDrafts();

      if (editMode) {
        // In edit mode, always use current comment body
        setText(commentBody);
      } else {
        // For new replies, check localStorage first
        const storedText = loadCommentDraft(storageKey);
        if (storedText) {
          setText(storedText);
        } else {
          setText(commentBody);
        }
      }
      setIsHydrated(true);
    }
  }, [isHydrated, editMode, commentBody, storageKey]);

  // In edit mode, update text when comment changes (e.g., after save and re-edit)
  useEffect(() => {
    if (isHydrated && editMode) {
      setText(commentBody);
    }
  }, [isHydrated, editMode, commentBody]);

  // Debounced save to localStorage without causing re-renders
  const saveToStorage = useCallback(
    (value: string) => {
      if (!storageKey) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (value) {
          saveCommentDraft(storageKey, value);
        } else {
          localStorage.removeItem(storageKey);
        }
      }, 500);
    },
    [storageKey]
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
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const handleCancel = () => {
    // Always remove the reply box state
    localStorage.removeItem(storageId);

    if (text === '') {
      // No text to save, just close and cleanup any existing draft
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
      localStorage.removeItem(storageId); // Remove reply box state
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
      className="mx-8 mb-4 flex max-w-3xl flex-col gap-6 rounded-md border bg-background p-4 text-primary shadow-sm"
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
