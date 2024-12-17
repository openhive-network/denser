import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useLayoutEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { getCookie } from '@smart-signer/lib/utils';
import i18nConfig from '../next-i18next.config';

const Providers = lazy(() => import('@/auth/components/common/providers'));

// Log Git revision details in browser's console.
if (typeof window !== 'undefined' && window) {
  console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH);
}

function App({ Component, pageProps }: AppProps) {
  useLayoutEffect(() => {
    if (!getCookie('NEXT_LOCALE')) {
      document.cookie = `NEXT_LOCALE=${i18n.defaultLocale}; SameSite=Lax`;
    }
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
