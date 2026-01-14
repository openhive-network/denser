import { Linkedin } from 'lucide-react';
import { configuredSiteDomain } from '@ui/config/public-vars';
import { useTranslation } from '@/blog/i18n/client';

export default function LinkedInShare({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation('common_blog');
  const winWidth = 720;
  const winHeight = 480;
  const winTop = 0;
  const winLeft = 0;
  const baseUrl = configuredSiteDomain.endsWith('/') ? configuredSiteDomain.slice(0, -1) : configuredSiteDomain;
  const href = baseUrl + url;

  const q =
    'title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(href) + '&source=Hive&mini=true';
  const openWindow = () => {
    return window.open(
      'https://www.linkedin.com/shareArticle?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };

  const shareLabel = `${t('post_content.footer.share_on')} LinkedIn`;
  return (
    <button
      type="button"
      className="cursor-pointer hover:text-destructive"
      onClick={openWindow}
      title={shareLabel}
      aria-label={shareLabel}
      data-testid="share-on-linkedin"
    >
      <Linkedin />
    </button>
  );
}
