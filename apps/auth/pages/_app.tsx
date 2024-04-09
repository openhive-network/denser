import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { parseCookie } from '@smart-signer/lib/utils';
import { plainToClass } from 'class-transformer';
import config from 'config';
import { AppConfig } from '@/auth/config/app-config';

const Providers = lazy(() => import('@/auth/components/common/providers'));
export let appConfig: AppConfig;

// Log Git revision details in browser's console.
if (typeof window !== 'undefined' && window) {
  console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH);
}

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    if (!cookieStore.hasOwnProperty(' NEXT_LOCALE')) {
      document.cookie = ` NEXT_LOCALE=${i18n.defaultLocale};`;
    }
    appConfig = plainToClass(AppConfig, config.util.toObject());
  }, []);

  return (
    <Suspense fallback={<span>Loading...</span>}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}

export default appWithTranslation(App);
