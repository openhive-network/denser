import '@hive/tailwindcss-config/globals.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import Script from 'next/script';

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
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-900">Hive Blog</h1>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
        <Script src={`${basePath}/__ENV.js`} strategy="beforeInteractive" />
      </body>
    </html>
  );
}
