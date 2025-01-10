import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { getCookie } from '@smart-signer/lib/utils';
import i18nConfig from '../next-i18next.config';

const Providers = lazy(() => import('@/blog/components/common/providers'));

function App({ Component, pageProps }: AppProps) {
  useLayoutEffect(() => {
    if (!getCookie('NEXT_LOCALE')) {
      document.cookie = `NEXT_LOCALE=${i18n.defaultLocale}; SameSite=Lax`;
    }
  }, []);

  function getDirection(language:string){
    return language === 'ar' ? 'rtl' : 'ltr';
  }

  useEffect(() => { 
    document.body.setAttribute("dir", getDirection(getCookie('NEXT_LOCALE'))); 
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
