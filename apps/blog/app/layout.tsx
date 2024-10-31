import { Providers } from './providers';
import '@hive/tailwindcss-config/globals.css';
import { Toaster } from '@ui/components/toaster';
import { ModalContainer } from '@smart-signer/components/modal-container';
import { TailwindIndicator } from '../components/tailwind-indicator';
import { ReactNode } from 'react';
import { useTranslation } from '../i18n/server';
import SiteHeader from '../features/layout/site-header';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { t } = await useTranslation('common_blog');
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
              </>
            </Providers>
          </div>
        </div>
      </body>
    </html>
  );
}
