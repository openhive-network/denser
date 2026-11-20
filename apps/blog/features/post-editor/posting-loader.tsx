'use client';

import { CircleSpinner } from '@ui/components/circle-spinner';
import { useTranslation } from '@/blog/i18n/client';

const PostingLoader = ({ isSubmitting }: { isSubmitting: boolean }) => {
  const { t } = useTranslation('common_blog');
  return isSubmitting ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-background/95 p-8 shadow-lg">
        <CircleSpinner loading={true} size={40} color="#dc2626" />
        <p className="text-lg font-medium">{t('submit_page.submitting')}</p>
      </div>
    </div>
  ) : null;
};

export default PostingLoader;
