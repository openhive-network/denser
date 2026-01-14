import { Twitter } from 'lucide-react';
import { configuredSiteDomain } from '@ui/config/public-vars';
import { useTranslation } from '@/blog/i18n/client';

export default function TwitterShare({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation('common_blog');
  const baseUrl = configuredSiteDomain.endsWith('/') ? configuredSiteDomain.slice(0, -1) : configuredSiteDomain;
  const href = baseUrl + url;
  const postTitle = title + ' — ' + 'Hive';
  const winWidth = 640;
  const winHeight = 320;
  const winTop = 0;
  const winLeft = 0;
  const q = 'text=' + encodeURIComponent(postTitle) + '&url=' + encodeURIComponent(href);
  const openWindow = () => {
    return window.open(
      'https://twitter.com/share?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };
  const shareLabel = `${t('post_content.footer.share_on')} Twitter`;
  return (
    <button
      type="button"
      className="cursor-pointer hover:text-destructive"
      onClick={openWindow}
      title={shareLabel}
      aria-label={shareLabel}
      data-testid="share-on-twitter"
    >
      <Twitter />
    </button>
  );
}
