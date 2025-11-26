import { Twitter } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';

export default function TwitterShare({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation('common_blog');
  const href = 'https://hive.blog' + url;
  const postTitle = title + ' — ' + 'Hive';
  const winWidth = 640;
  const winHeight = 320;
  const winTop = 0;
  const winLeft = 0;
  const q = 'text=' + encodeURIComponent(postTitle) + '&url=' + encodeURIComponent(href);
  const openWindow = () => {
    return window.open(
      'http://twitter.com/share?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };
  return (
    <div
      className="cursor-pointer hover:text-destructive"
      onClick={openWindow}
      title={t('post_content.footer.share_on') + `Twitter`}
      data-testid="share-on-twitter"
    >
      <Twitter />
    </div>
  );
}
