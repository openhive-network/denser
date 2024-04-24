import Link from 'next/link';
import { Button } from '@ui/components/button';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { HiveRendererContext } from './hive-renderer-context';
import { useLocalStorage } from 'usehooks-ts';
import { Icons } from '@ui/components/icons';
import MdEditor from './md-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';

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
  comment?: string;
}) {
  const [storedPost, storePost, removePost] = useLocalStorage<string>(`replyTo-/${username}/${permlink}`, '');
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${username}`,
    DEFAULT_PREFERENCES
  );
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(comment ? comment : storedPost ? storedPost : '');
  const [cleanedText, setCleanedText] = useState('');
  const { hiveRenderer } = useContext(HiveRendererContext);

  useEffect(() => {
    if (hiveRenderer) {
      const nextCleanedText = text ? hiveRenderer.render(text) : '';
      setCleanedText(nextCleanedText);
      if (text) {
        storePost(text);
      }
    }
  }, [hiveRenderer, text]);

  const handleCancel = () => {
    localStorage.removeItem(storageId);
    if (text === '') return onSetReply(false);
    const confirmed = confirm(t('post_content.footer.comment.exit_editor'));
    if (confirmed) {
      onSetReply(false);
      removePost();
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
              setText(value);
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
        <div className="flex flex-col md:flex-row">
          <Button
            disabled={text === ''}
            onClick={() => {
              if (parentPermlink) {
                transactionService.updateComment(
                  username,
                  parentPermlink,
                  permlink,
                  cleanedText,
                  preferences
                );
              } else {
                transactionService.comment(username, permlink, cleanedText, preferences);
              }
              setText('');
              removePost();
              localStorage.removeItem(storageId);
              onSetReply(false);
            }}
          >
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
          <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
            <span className="text-red-500">{t('post_content.footer.comment.markdown_styling_guide')}</span>
          </Link>
        </div>
        {cleanedText ? (
          <div
            dangerouslySetInnerHTML={{
              __html: cleanedText
            }}
            className="prose max-w-full border-2 border-slate-200 p-2 dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
