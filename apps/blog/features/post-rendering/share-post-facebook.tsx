import { Facebook } from 'lucide-react';
import { configuredSiteDomain } from '@ui/config/public-vars';
import { useTranslation } from '@/blog/i18n/client';

export default function FacebookShare({ url }: { url: string }) {
  const { t } = useTranslation('common_blog');
  const baseUrl = configuredSiteDomain.endsWith('/') ? configuredSiteDomain.slice(0, -1) : configuredSiteDomain;
  const href = baseUrl + url;
  const openWindow = () => {
    return window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${href}`,
      'fbshare',
      'width=600, height=400, scrollbars=no'
    );
  };
  const shareLabel = `${t('post_content.footer.share_on')} Facebook`;
  return (
    <button
      type="button"
      className="cursor-pointer hover:text-destructive"
      onClick={openWindow}
      title={shareLabel}
      aria-label={shareLabel}
      data-testid="share-on-facebook"
    >
      <Facebook />
    </button>
  );
}
