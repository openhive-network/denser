'use client';

import { useEffect } from 'react';
import { getCookie } from '@ui/lib/utils';
import { languages, defaultLocale, cookieName } from '@/wallet/i18n/settings';

export default function ClientEffects() {
  // Set default locale cookie if missing or invalid
  useEffect(() => {
    const currentLocale = getCookie(cookieName);
    if (!currentLocale || !languages.includes(currentLocale)) {
      document.cookie = `${cookieName}=${defaultLocale}; path=/; SameSite=Lax`;
    }
  }, []);

  // Set document direction for RTL languages
  useEffect(() => {
    const locale = getCookie(cookieName);
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
