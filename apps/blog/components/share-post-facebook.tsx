import { Facebook } from 'lucide-react';
import useTranslation from 'next-translate/useTranslation';

export default function FacebookShare({ url }: { url: string }) {
  const { t } = useTranslation('common_blog');
  const href = 'https://hive.blog' + url;
  const openWindow = () => {
    return window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${href}`,
      'fbshare',
      'width=600, height=400, scrollbars=no'
    );
  };
  return (
    <div className='cursor-pointer hover:text-red-600' onClick={openWindow}
         title={t('post_content.footer.share_on') + ` Facebook`}>
      <Facebook />
    </div>
  );
}
