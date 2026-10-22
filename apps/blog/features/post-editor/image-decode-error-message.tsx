'use client';

import { useTranslation } from '@/blog/i18n/client';

/** Tells the user the browser could not read the image they picked, and what to try instead. */
export function ImageDecodeErrorMessage() {
  const { t } = useTranslation('common_blog');
  return (
    <p className="font-semibold text-white" data-testid="image-decode-error-message">
      {t('submit_page.image_decode_failed')}
    </p>
  );
}
