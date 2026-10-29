import '@hive/tailwindcss-config/globals.css';
import * as Sentry from '@sentry/nextjs';
import { ReactNode, Suspense } from 'react';
import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { NONCE_HEADER, parseNonce } from '@hive/middleware/lib/csp';
import MainBar from '../features/layouts/site-header/main-bar';
import ChatWidget from '@/blog/components/chat-widget';
import ClientEffects from '../features/layouts/site-header/client-effects';
import { Providers } from '../features/layouts/providers';
import { StorageCleanup } from '@ui/components/storage-cleanup';
import CondenserMigration from '../components/condenser-migration';
import { getEnvVersion } from '@ui/lib/env-version';
import { ImagesHostHints } from '@ui/components/images-host-hints';
import { LocaleProvider } from '@ui/components/locale-context';
import { cookieName, resolveLocale } from '../i18n/settings';
import { JsonLd } from '../components/json-ld';
import { INDEX_ROBOTS } from '../lib/seo-robots';
import { SITE_URL } from '../lib/site-url';
import { websiteJsonLd } from '../lib/structured-data';
import LiteApiSeed from '../features/lite-account/lite-api-seed';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC =
  'Communities without borders. A social network owned and operated by its users, powered by Hive.';

const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hive',
    template: '%s - Hive'
  },
  description: SITE_DESC,
  robots: INDEX_ROBOTS,
  icons: {
    icon: `${basePath}/favicon.ico`
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
  }
} as const satisfies Metadata;

export function generateMetadata(): Metadata {
  if (!process.env.REACT_APP_SENTRY_DSN) {
    return metadata;
  }

  return {
    ...metadata,
    other: { ...Sentry.getTraceData() }
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side locale and language handling
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(cookieName)?.value);
  const isRTL = locale === 'ar';
  const nonce = parseNonce((await headers()).get(NONCE_HEADER));

  // Generate stable version hash for __ENV.js cache-busting
  // Only changes when REACT_APP_* env variables change
  const envVersion = getEnvVersion();

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Use plain script tag for guaranteed synchronous loading of env globals */}
        <script src={`${basePath}/__ENV.js?v=${envVersion}`} nonce={nonce} />
        <ImagesHostHints />
      </head>
      <body className="bg-background-secondary">
        <JsonLd data={websiteJsonLd()} />
        <Suspense fallback={null}>
          <LiteApiSeed />
        </Suspense>
        <LocaleProvider locale={locale}>
          <div className="min-h-screen">
            <Providers nonce={nonce}>
              <>
                <StorageCleanup />
                <CondenserMigration />
                <MainBar />
                {/* Next after the header in the Tab order, wherever it shows, not after every post */}
                <ChatWidget />
                <main className="mx-auto">{children}</main>
              </>
            </Providers>
          </div>
          <ClientEffects />
        </LocaleProvider>
      </body>
    </html>
  );
}
