import { Facebook } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';
import { getPostShareUrl } from './lib/post-share-url';
import { SharePostButton } from './share-post-button';

export default function FacebookShare({ url }: { url: string }) {
  const { t } = useTranslation('common_blog');
  const href = getPostShareUrl(url);
  const openWindow = () => {
    return window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(href)}`,
      'fbshare',
      'width=600, height=400, scrollbars=no'
    );
  };
  return (
    <SharePostButton
      onClick={openWindow}
      label={t('post_content.footer.share_on') + `Facebook`}
      data-testid="share-on-facebook"
    >
      <Facebook className="h-[18px] w-[18px]" aria-hidden />
    </SharePostButton>
  );
}
