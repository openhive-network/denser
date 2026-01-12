import '@hive/tailwindcss-config/globals.css';
import { ReactNode } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Providers } from '../features/layouts/providers';
import SiteHeader from '../components/site-header';
import { StorageCleanup } from '@hive/ui';
import { TailwindIndicator } from '../components/tailwind-indicator';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC = 'Hive Wallet is an online wallet for managing Hive accounts.';

export const metadata: Metadata = {
  title: {
    default: 'Hive Wallet',
    template: '%s - Hive Wallet'
  },
  description: SITE_DESC,
  icons: {
    icon: '/favicon.ico'
  },
  openGraph: {
    type: 'website',
    siteName: 'Hive Wallet',
    title: 'Hive Wallet',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-share.png']
  },
  twitter: {
    card: 'summary',
    site: '@hiveblocks',
    title: '#Hive',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-share.png']
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

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-background-secondary">
        <Providers>
          <StorageCleanup />
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
          </div>
          <TailwindIndicator />
        </Providers>
        <Script src={`${basePath}/__ENV.js`} strategy="beforeInteractive" />
      </body>
    </html>
  );
}
