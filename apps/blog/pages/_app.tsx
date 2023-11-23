import '@hive/tailwindcss-config/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense, useEffect } from 'react';
import { appWithTranslation } from 'next-i18next';
import { i18n } from 'next-i18next.config';
import { parseCookie } from '@/blog/lib/utils';

const Providers = lazy(() => import('@/blog/components/common/providers'));

// // Log Git revision details in browser's console.
// if (typeof window !== 'undefined' && window) {
//   console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH,
//       GIT_LASTCOMMITDATETIME);
// }

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const cookieStore = parseCookie(document.cookie);

    if (!cookieStore.hasOwnProperty('NEXT_LOCALE')) {
      document.cookie = `NEXT_LOCALE=${i18n.defaultLocale};path=/`;
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