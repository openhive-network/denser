import Link from 'next/link';
import { Button } from '@ui/components/button';
import { useContext, useEffect, useState, useRef, use } from 'react';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { HiveRendererContext } from './hive-renderer-context';
import { useLocalStorage } from 'usehooks-ts';
import { Icons } from '@ui/components/icons';
import MdEditor from './md-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';

import { getLogger } from '@ui/lib/logging';
import { useUser } from '@smart-signer/lib/auth/use-user';
import useManabars from './hooks/useManabars';
import { hoursAndMinutes } from '../lib/utils';
import { Entry } from '@transaction/lib/bridge';
import RendererContainer from './rendererContainer';
const logger = getLogger('app');

export function ReplyTextbox({
  onSetReply,
  username,
  permlink,
  parentPermlink,
  storageId,
  editMode,
  comment
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
  parentPermlink?: string;
  storageId: string;
  editMode: boolean;
  comment: Entry | string;
}) {
  const [storedPost, storePost, removePost] = useLocalStorage<string>(`replyTo-/${username}/${permlink}`, '');
  const { user } = useUser();
  const { manabarsData } = useManabars(user.username);
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(
    typeof comment === 'string' ? comment : comment.body ? comment.body : storedPost ? storedPost : ''
  );

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
        transactionService.updateComment(username, parentPermlink, permlink, text, payout);
      } else {
        transactionService.comment(username, permlink, text, preferences);
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
      className="mx-8 mb-4 flex flex-col gap-6 rounded-md border bg-card p-4 text-card-foreground shadow-sm dark:bg-slate-900"
      data-testid="reply-editor"
    >
      <div className="flex flex-col gap-4">
        <Link href={`#`}>
          <h1 className="text-sm text-red-500">{t('post_content.footer.comment.disable_editor')}</h1>
        </Link>
        <div>
          <MdEditor
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
          <p className="flex items-center border-2 border-t-0 border-slate-200 bg-gray-100 p-1 text-xs font-light text-slate-500 dark:border-black dark:bg-slate-950">
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
          <Button ref={btnRef} disabled={text === ''} onClick={() => postComment()}>
            {t('post_content.footer.comment.post')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleCancel()}
            className="font-thiny text-slate-500 hover:text-red-500"
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
                <Link className="text-red-500" href={`/@${user.username}/settings`}>
                  {t('post_content.footer.comment.update_settings')}
                </Link>
              </div>
            )}
            <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
              <span className="text-red-500">{t('post_content.footer.comment.markdown_styling_guide')}</span>
            </Link>
          </div>
        </div>

        <RendererContainer
          body={text}
          className="prose max-w-full border-2 border-slate-200 p-2 dark:prose-invert"
        />
      </div>
    </div>
  );
}
