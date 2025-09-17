import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { getCookie } from '@smart-signer/lib/storage-utils';
import { i18n } from 'next-i18next.config';
import i18nConfig from '../next-i18next.config';

const Providers = lazy(() => import('@/wallet/components/common/providers'));

function App({ Component, pageProps }: AppProps) {
  useLayoutEffect(() => {
    const currentLocale = getCookie('NEXT_LOCALE');
    if (!currentLocale || !i18nConfig.i18n.locales.includes(currentLocale)) {
      document.cookie = `NEXT_LOCALE=${i18n.defaultLocale}; path=/; SameSite=Lax`;
    }
  }, []);

  function getDirection(language: string) {
    return language === 'ar' ? 'rtl' : 'ltr';
  }

  useEffect(() => {
    document.body.setAttribute('dir', getDirection(getCookie('NEXT_LOCALE')));
  }, []);

  return (
    <Suspense fallback={<span>Loading...</span>}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}

export default appWithTranslation(App, i18nConfig);
