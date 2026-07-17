import { Linkedin } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';
import { configuredBlogDomain } from '@ui/config/public-vars';

export default function LinkedInShare({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation('common_blog');
  const winWidth = 720;
  const winHeight = 480;
  const winTop = 0;
  const winLeft = 0;
  const postTitle = title + ' — ' + 'Hive';
  const href = `https://${configuredBlogDomain}${url}`;

  const q =
    'title=' + encodeURIComponent(postTitle) + '&url=' + encodeURIComponent(href) + '&source=Hive&mini=true';
  const openWindow = () => {
    return window.open(
      'https://www.linkedin.com/shareArticle?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };

  return (
    <button
      type="button"
      className="flex items-center border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-destructive"
      onClick={openWindow}
      title={t('post_content.footer.share_on') + `LinkedIn`}
      aria-label={t('post_content.footer.share_on') + `LinkedIn`}
      data-testid="share-on-linkedin"
    >
      <Linkedin className="h-[18px] w-[18px]" />
    </button>
  );
}
