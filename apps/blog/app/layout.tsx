import '@hive/tailwindcss-config/globals.css';
import * as Sentry from '@sentry/nextjs';
import { ReactNode } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import MainBar from '../features/layouts/site-header/main-bar';
import ClientEffects from '../features/layouts/site-header/client-effects';
import { Providers } from '../features/layouts/providers';
import VisitLoggerClient from '../lib/visit-logger-client';
import { StorageCleanup } from '@hive/ui';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC =
  'Communities without borders. A social network owned and operated by its users, powered by Hive.';

const metadata = {
  title: {
    default: 'Hive',
    template: '%s - Hive'
  },
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
} as const satisfies Metadata;

export function generateMetadata(): Metadata {
  if (!process.env.REACT_APP_SENTRY_DSN) {
    return metadata;
  }

  return {
    ...metadata,
    other: {
      ...metadata.other,
      ...Sentry.getTraceData()
    }
  };
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side locale and language handling
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const isRTL = locale === 'ar';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <head>
      <script
          src={`${basePath}/__ENV.js?v=${Date.now()}`}
      />
      </head>
      <body className="bg-background-secondary">
        <div className="min-h-screen">
          <Providers>
            <>
              <StorageCleanup />
              <VisitLoggerClient />
              <MainBar />
              <main className="mx-auto">{children}</main>
            </>
          </Providers>
        </div>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ClientEffects />
      </body>
    </html>
  );
}
