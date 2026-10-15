'use client';

import { useEffect } from 'react';
import { ensureLocaleCookie } from '@ui/lib/locale-cookie';
import { languages, defaultLocale } from '@/wallet/i18n/settings';

export default function ClientEffects() {
  // Set default locale cookie if missing or invalid, and the document direction for RTL languages
  useEffect(() => {
    const locale = ensureLocaleCookie(defaultLocale, languages);
    document.body.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, []);

  // Handle browser back/forward navigation in subdirectory deployments
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath) {
      const handlePopState = () => {
        const pathWithoutBase = window.location.pathname.replace(basePath, '');
        if (pathWithoutBase.startsWith('/@')) {
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
