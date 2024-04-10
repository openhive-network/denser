import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { parseCookie } from '@smart-signer/lib/utils';
import { AppConfigService } from '@/auth/lib/app-config/app-config-service';
import { appConfigSchema } from '@/auth/lib/app-config/app-config-schema';
import config from 'config';
import { isBrowser } from '@ui/lib/logger';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

if (isBrowser()) {
  // Log Git revision details in browser's console.
  console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH);

  logger.info('appConfig: %o', AppConfigService.config);
} else {
  // Validate config passed to application via configuration files and
  // environment variables.
  try {
    appConfigSchema.parse(config.util.toObject());
    logger.info("Application Config is OK");
  } catch (error) {
    const parts = [
      'Application has been stopped,',
      'because validation of configuration failed.',
      'Error is: %o'
    ];
    logger.error(parts.join(' '), error);
    // TODO Is exiting process a good idea here?
    // Exit application, means shut down server process.
    process.exit(1)
  }
}

const Providers = lazy(() => import('@/auth/components/common/providers'));

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
