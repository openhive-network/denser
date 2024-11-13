'use client';
import { Linkedin } from 'lucide-react';
import { useTranslation } from '../i18n/client';

export default function LinkedInShare({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation('common_blog');
  const winWidth = 720;
  const winHeight = 480;
  const winTop = 0;
  const winLeft = 0;

  const q =
    'title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '&source=Steemit&mini=true';
  const openWindow = () => {
    return window.open(
      'https://www.linkedin.com/shareArticle?' + q,
      'Share',
      'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
    );
  };

  return (
    <div
      className="cursor-pointer hover:text-destructive"
      onClick={openWindow}
      title={t('post_content.footer.share_on') + `LinkedIn`}
      data-testid="share-on-linkedin"
    >
      <Linkedin />
    </div>
  );
}
