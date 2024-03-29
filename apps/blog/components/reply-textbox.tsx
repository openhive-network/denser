import Link from 'next/link';
import { Textarea } from '@ui/components/textarea';
import { Button } from '@ui/components/button';
import { useContext, useEffect, useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Input } from '@ui/components/input';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { transactionService } from '@transaction/index';
import { createPermlink } from '@transaction/lib/utils';
import { HiveRendererContext } from './hive-renderer-context';
import DialogLogin from './dialog-login';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';

export function ReplyTextbox({
  onSetReply,
  username,
  permlink,
  storageId
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
  storageId: string;
}) {
  const [storedPost, storePost] = useLocalStorage<string>(`replyTo-/${username}/${permlink}`, '');
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(storedPost ? storedPost : '');
  const [cleanedText, setCleanedText] = useState('');
  const [replyPermlink, setReplyPermlink] = useState('');
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

  useEffect(() => {
    const createReplyPermlink = async () => {
      if (user && user.isLoggedIn) {
        const plink = await createPermlink('', user.username, permlink);
        setReplyPermlink(plink);
      }
    };

    createReplyPermlink();
  }, [user, permlink]);

  const handleCancel = () => {
    localStorage.removeItem(storageId);
    if (text === '') return onSetReply(false);
    const confirmed = confirm(t('post_content.footer.comment.exit_editor'));
    if (confirmed) {
      onSetReply(false);
      localStorage.removeItem(`replyTo-/${username}/${permlink}`);
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
          <Textarea
            className="border-2 border-slate-200 dark:text-white"
            onChange={(e) => setText(e.target.value)}
            placeholder={t('post_content.footer.comment.reply')}
            value={text}
          />
          <p className="border-2 border-t-0 border-slate-200 bg-gray-100 p-1 text-xs font-light text-slate-500 dark:border-black dark:bg-slate-950">
            {t('post_content.footer.comment.insert_images')}{' '}
            <span>
              <Label className="cursor-pointer text-red-500" htmlFor="picture">
                {t('post_content.footer.comment.selecting_them')}
              </Label>
              <Input id="picture" type="file" className="hidden" />
            </span>
          </p>
        </div>
        <div className="flex flex-col md:flex-row">
          {user && user.isLoggedIn ? (
            <Button
              disabled={text === ''}
              onClick={() => {
                transactionService.comment(username, permlink, cleanedText);
                setText('');
                localStorage.removeItem(`replyTo-/${username}/${permlink}`);
                localStorage.removeItem(storageId);
                onSetReply(false);
              }}
            >
              {t('post_content.footer.comment.post')}
            </Button>
          ) : (
            <DialogLogin>
              <Button disabled={text === ''}> {t('post_content.footer.comment.post')}</Button>
            </DialogLogin>
          )}
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
