import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { AppConfigService } from '@/auth/lib/app-config/app-config-service';
import { isBrowser } from '@ui/lib/logger';
import { getCookie } from '@smart-signer/lib/utils';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

if (isBrowser()) {
  // Log Git revision details in browser's console.
  console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH);

  logger.info('appConfig: %o', AppConfigService.config);
} else {
  AppConfigService.init();
}

const Providers = lazy(() => import('@/auth/components/common/providers'));

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
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

export default appWithTranslation(App);
