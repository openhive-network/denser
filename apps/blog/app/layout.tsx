'use client';
import { Providers } from './providers';
import '@hive/tailwindcss-config/globals.css';
import { Toaster } from '@ui/components/toaster';
import { ModalContainer } from '@smart-signer/components/modal-container';

import { TailwindIndicator } from '../components/tailwind-indicator';
import { ReactNode } from 'react';
import SiteHeader from '../features/layout/site-header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1 bg-background-secondary">
            <Providers>
              <>
                <SiteHeader />
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
