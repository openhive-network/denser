'use client';

import { Providers } from './providers';
import '@hive/tailwindcss-config/globals.css';
import Head from 'next/head';
import { Toaster } from '@ui/components/toaster';
import { useTheme } from 'next-themes';
import { ModalContainer } from '@smart-signer/components/modal-container';
import { TailwindIndicator } from '../components/tailwind-indicator';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
      </Head>
      <body>
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1 bg-background-secondary">
            <Providers>
              <>
                {children}
                <ModalContainer />
                <Toaster />
                <TailwindIndicator />
              </>
            </Providers>
          </div>
        </div>
      </body>
    </html>
  );
}
