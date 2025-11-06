import '@hive/tailwindcss-config/globals.css';
import { ReactNode } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import MainBar from '../features/layouts/site-header/main-bar';
import ClientEffects from '../features/layouts/site-header/client-effects';
import { Providers } from '../features/layouts/providers';
import { getQueryClient } from '../lib/react-query';
import { getObserverFromCookies } from '../lib/auth-utils';
import { Hydrate, dehydrate } from '@tanstack/react-query';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC =
  'Communities without borders. A social network owned and operated by its users, powered by Hive.';

export const metadata: Metadata = {
  title: 'Hive',
  description: SITE_DESC,
  icons: {
    icon: '/favicon.ico'
  },
  openGraph: {
    type: 'website',
    siteName: 'Hive',
    title: 'Hive',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-share.png']
  },
  twitter: {
    card: 'summary',
    site: '@hiveblocks',
    title: '#Hive.io',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-twshare.png']
  },
  other: {
    'fb:app_id': 'YOUR_FB_APP_ID'
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side locale and language handling
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const isRTL = locale === 'ar';
  const queryClient = getQueryClient();
  const observer = getObserverFromCookies();
  await queryClient.prefetchQuery({
    queryKey: ['observerData', observer],
    queryFn: () => Promise.resolve(observer)
  });

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-background-secondary">
        <div className="min-h-screen">
          <Providers>
            <>
              <Hydrate state={dehydrate(queryClient)}>
                <MainBar />
              </Hydrate>
              <main className="mx-auto">{children}</main>
            </>
          </Providers>
        </div>
        <Script src={`${basePath}/__ENV.js`} strategy="beforeInteractive" />
        <ClientEffects />
      </body>
    </html>
  );
}
