import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { getCookie } from '@smart-signer/lib/utils';
import i18nConfig from '../next-i18next.config';
import { getLanguage } from '../utils/language';
import Providers from '@/blog/components/common/providers';

function App({ Component, pageProps }: AppProps) {
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

  return (
    <Providers dehydratedState={pageProps.dehydratedState}>
      <Component {...pageProps} />
    </Providers>
  );
}

export default appWithTranslation(App, i18nConfig);
