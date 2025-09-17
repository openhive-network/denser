import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { getCookie } from '@smart-signer/lib/utils';
import i18nConfig from '../next-i18next.config';
import { getLanguage } from '../utils/language';
import Providers from '@/blog/components/common/providers';
import { useRouter } from 'next/router';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Handle locale cookie setting
    if (typeof window !== 'undefined' && !getCookie('NEXT_LOCALE')) {
      document.cookie = `NEXT_LOCALE=${i18n.defaultLocale}; SameSite=Lax`;
    }

    // Handle direction setting
    const locale = getCookie('NEXT_LOCALE');
    document.body.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

    // Handle language setting
    const savedLang = getLanguage();
    if (savedLang) {
      document.documentElement.lang = savedLang;
    }
  }, []);

  // Global handler for browser back/forward navigation in subdirectory deployments
  // This fixes issues when navigating back between different route handlers
  useEffect(() => {
    if (router.basePath) {
      const handlePopState = () => {
        // Get the current path without basePath
        const pathWithoutBase = window.location.pathname.replace(router.basePath, '');

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
  }, [router.basePath]);

  return (
    <Providers dehydratedState={pageProps.dehydratedState}>
      <Component {...pageProps} />
    </Providers>
  );
}

export default appWithTranslation(App, i18nConfig);
