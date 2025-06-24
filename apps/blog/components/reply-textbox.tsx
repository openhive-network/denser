import Link from 'next/link';
import { Button } from '@ui/components/button';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { useLocalStorage } from 'usehooks-ts';
import { Icons } from '@ui/components/icons';
import MdEditor from './md-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';
import { useUser } from '@smart-signer/lib/auth/use-user';
import useManabars from './hooks/useManabars';
import { hoursAndMinutes } from '../lib/utils';
import { Entry } from '@transaction/lib/extended-hive.chain'; 
import RendererContainer from './rendererContainer';
import { getLogger } from '@ui/lib/logging';
import { useCommentMutation, useUpdateCommentMutation } from './hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { commentClassName } from './comment-list-item';
import DenserMdEditor from '../features/md-editor/editor';
import Renderer from '../features/renderer/renderer';

const logger = getLogger('app');

export function ReplyTextbox({
  onSetReply,
  username,
  permlink,
  parentPermlink,
  storageId,
  editMode,
  comment,
  denserEditor
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
  parentPermlink?: string;
  storageId: string;
  editMode: boolean;
  comment: Entry | string;
  denserEditor: boolean;
}) {
  const [storedPost, storePost, removePost] = useLocalStorage<string>(`replyTo-/${username}/${permlink}`, '');
  const { user } = useUser();
  const [renderMethod, setRenderMethod] = useState<'denser' | 'classic'>('denser');
  const { manabarsData } = useManabars(user.username);
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(
    storedPost ? storedPost : typeof comment === 'string' ? comment : comment.body ? comment.body : ''
  );
  const commentMutation = useCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();

  useEffect(() => {
    storePost(text);
  }, [text]);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleCancel = () => {
    localStorage.removeItem(storageId);
    if (text === '') return onSetReply(false);
    const confirmed = confirm(t('post_content.footer.comment.exit_editor'));
    if (confirmed) {
      onSetReply(false);
      removePost();
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
          body: text
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
          denserEditor
        };
        try {
          await commentMutation.mutateAsync(commentParams);
        } catch (error) {
          handleError(error, { method: 'comment', params: commentParams });
          throw error;
        }
      }
      setText('');
      removePost();
      localStorage.removeItem(storageId);
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
      className="mx-8 mb-4 flex flex-col gap-6 rounded-md border bg-background p-4 text-primary shadow-sm"
      data-testid="reply-editor"
    >
      <div className="flex flex-col gap-4">
        <Link href={`#`}>
          <h1 className="text-sm text-destructive">{t('post_content.footer.comment.disable_editor')}</h1>
        </Link>
        <div>
          {denserEditor ? (
            <DenserMdEditor
              text={text}
              onChange={(value) => {
                if (value === '') {
                  setText(value);
                  removePost();
                } else {
                  setText(value);
                }
              }}
              data-testid="post-area-editor"
            />
          ) : (
            <MdEditor
              windowheight={200}
              htmlMode={editMode}
              onChange={(value) => {
                if (value === '') {
                  setText(value);
                  removePost();
                } else {
                  setText(value);
                }
              }}
              persistedValue={text}
              placeholder={t('post_content.footer.comment.reply')}
            />
          )}
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

        {renderMethod === 'denser' ? (
          <Renderer content={text} className={commentClassName} />
        ) : (
          <RendererContainer
            body={text}
            author=""
            className={commentClassName + ' max-w-full border-2 border-background-tertiary p-2'}
          />
        )}
      </div>
    </div>
  );
}
