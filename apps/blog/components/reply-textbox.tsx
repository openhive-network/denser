import Link from 'next/link';
import { Textarea } from '@hive/ui/components/textarea';
import { Button } from '@hive/ui/components/button';
import { useEffect, useMemo, useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Input } from '@hive/ui/components/input';
import { useTranslation } from 'next-i18next';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { operationService } from '@smart-signer/lib/operations';

export function ReplyTextbox({
  onSetReply,
  username,
  permlink
}: {
  onSetReply: (e: boolean) => void;
  username: string;
  permlink: string;
}) {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [text, setText] = useState('');
  const [cleanedText, setCleanedText] = useState('');

  const renderer = useMemo(
    () =>
      new DefaultRenderer({
        baseUrl: 'https://hive.blog/',
        breaks: true,
        skipSanitization: false,
        allowInsecureScriptTags: false,
        addNofollowToLinks: true,
        addTargetBlankToLinks: true,
        addCssClassToLinks: 'external-link',
        doNotShowImages: false,
        ipfsPrefix: '',
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
        usertagUrlFn: (account: string) => '/@' + account,
        hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
        isLinkSafeFn: (url: string) => false
      }),
    []
  );

  useEffect(() => {
    const nextCleanedText = text ? renderer.render(text) : '';
    setCleanedText(nextCleanedText);
  }, [renderer, text]);

  const handleCancel = () => {
    if (text === '') return onSetReply(false);
    const confirmed = confirm(t('post_content.footer.comment.exit_editor'));
    if (confirmed) {
      onSetReply(false);
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
          <Button
            disabled={text === ''}
            onClick={() => operationService.addComment(username, user, permlink, cleanedText)}
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
