'use client';

import { useTranslation } from '@/blog/i18n/client';

/**
 * Skip link component for keyboard navigation accessibility.
 * Allows users to skip repetitive navigation and jump directly to main content.
 * Must be a client component to use useTranslation hook.
 */
export default function SkipLink() {
  const { t } = useTranslation('common_blog');

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring"
    >
      {t('accessibility.skip_to_main')}
    </a>
  );
}
