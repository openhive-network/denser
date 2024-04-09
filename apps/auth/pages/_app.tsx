import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { parseCookie } from '@smart-signer/lib/utils';
import config from "config";
import { AppConfigSchema } from '@/auth/lib/app-config';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const Providers = lazy(() => import('@/auth/components/common/providers'));

export let appConfig: AppConfigSchema;

// Do next things on client only.
if (typeof window !== 'undefined' && window) {
  // Log Git revision details in browser's console.
  console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH);

  // Set App Config global object and freeze it.
  appConfig = config.util.toObject();
  Object.freeze(appConfig);
}

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);
    if (!cookieStore.hasOwnProperty(' NEXT_LOCALE')) {
      document.cookie = ` NEXT_LOCALE=${i18n.defaultLocale};`;
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

export default appWithTranslation(App);
