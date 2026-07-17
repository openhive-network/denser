import { Facebook } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';
import { configuredBlogDomain } from '@hive/ui/config/public-vars';

export default function FacebookShare({ url }: { url: string }) {
  const { t } = useTranslation('common_blog');
  const href = `https://${configuredBlogDomain}${url}`;
  const openWindow = () => {
    return window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${href}`,
      'fbshare',
      'width=600, height=400, scrollbars=no'
    );
  };
  return (
    <button
      type="button"
      className="flex items-center border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-destructive"
      onClick={openWindow}
      title={t('post_content.footer.share_on') + `Facebook`}
      aria-label={t('post_content.footer.share_on') + `Facebook`}
      data-testid="share-on-facebook"
    >
      <Facebook className="h-[18px] w-[18px]" />
    </button>
  );
}
