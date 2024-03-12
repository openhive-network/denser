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
import { useSigner } from '@smart-signer/lib/use-signer';
import { HiveRendererContext } from './hive-renderer-context';
import DialogLogin from './dialog-login';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useUpdateReplaysData } from './hooks/use-update-replays';

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
  const { signerOptions } = useSigner();
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState(storedPost ? storedPost : '');
  const [cleanedText, setCleanedText] = useState('');
  const [replyPermlink, setReplyPermlink] = useState('');
  const { hiveRenderer } = useContext(HiveRendererContext);
  const { mutate } = useUpdateReplaysData(username, permlink);

  const handleAddReplyClick = () => {
    const reply = {
      'calcifero/local': {
        post_id: 12345,
        active_votes: [],
        author: 'calcifero',
        author_payout_value: '0.000 HBD',
        author_reputation: 40.95,
        beneficiaries: [],
        blacklists: [],
        body: '## from code',
        category: 'mutate',
        children: 15,
        created: '2024-03-06T14:25:33',
        curator_payout_value: '0.000 HBD',
        depth: 0,
        is_paidout: false,
        json_metadata: { tags: ['test'], app: 'hiveblog/0.1', format: 'markdown' },
        max_accepted_payout: '1000000.000 HBD',
        net_rshares: 532048136619,
        payout: 0.304,
        payout_at: '2024-03-13T14:25:33',
        pending_payout_value: '0.304 HBD',
        percent_hbd: 10000,
        permlink: 'er-8',
        promoted: '0.000 HBD',
        replies: [],
        stats: { hide: false, gray: false, total_votes: 3, flag_weight: 0 },
        title: 'er 8',
        updated: '2024-03-06T14:25:33',
        url: '/test/@calcifero/er-8'
      }
    };
    mutate(reply);
  };

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
                handleAddReplyClick();
                // transactionService.processHiveAppOperation((builder) => {
                //   builder
                //     .push({
                //       comment: {
                //         parent_author: username,
                //         parent_permlink: permlink,
                //         author: user.username,
                //         permlink: replyPermlink,
                //         title: '',
                //         body: cleanedText,
                //         json_metadata: '{"app":"hiveblog/0.1"}'
                //       }
                //     })
                //     .build();
                // }, signerOptions);
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
