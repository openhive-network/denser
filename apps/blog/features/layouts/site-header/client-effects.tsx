'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@ui/components/locale-context';
import { ensureLocaleCookie } from '@ui/lib/locale-cookie';
import { defaultLocale } from '@/blog/i18n/settings';
import { takeLegacyStoredLanguage } from '@/blog/utils/language';

export default function ClientEffects() {
  const router = useRouter();
  const { locale: renderedLocale } = useLocale();

  useEffect(() => {
    const locale = ensureLocaleCookie(takeLegacyStoredLanguage() ?? defaultLocale);
    // A language migrated after the server rendered (Condenser, older builds' localStorage)
    if (locale !== renderedLocale) {
      document.documentElement.lang = locale;
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global handler for browser back/forward navigation in subdirectory deployments
  // This fixes issues when navigating back between different route handlers
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath) {
      const handlePopState = () => {
        // Get the current path without basePath
        const pathWithoutBase = window.location.pathname.replace(basePath, '');

        // Force reload when navigating to/from user profile pages
        // This ensures the correct route handler is used
        if (pathWithoutBase.startsWith('/@')) {
          // Small timeout to let browser complete navigation first
          setTimeout(() => {
            window.location.replace(window.location.href);
          }, 0);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return null;
}
