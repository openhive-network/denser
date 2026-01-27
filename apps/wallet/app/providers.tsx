'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FC, PropsWithChildren, useMemo } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { SignerProvider } from '@smart-signer/components/signer-provider';
import { getQueryClient } from '@/wallet/lib/react-query';
import { ThemeProvider } from '@/wallet/components/theme-provider';
import SiteHeader from '@/wallet/components/site-header';
import { ModalContainer } from '@smart-signer/components/modal-container';
import { Toaster } from '@ui/components/toaster';
import { TailwindIndicator } from '@/wallet/components/tailwind-indicator';

// Side-effect import: initializes i18next for client components
// This must happen before any component calls useTranslation
import '@/wallet/i18n/client';

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useMemo(() => getQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <SignerProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeColorMeta />
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
          </div>
        </ThemeProvider>
      </SignerProvider>
      <ModalContainer />
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
      <TailwindIndicator />
    </QueryClientProvider>
  );
};

/**
 * Sets the theme-color meta tag based on current theme.
 * Extracted to avoid useTheme() at the Providers level (before ThemeProvider).
 */
function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  return (
    <Head>
      <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
    </Head>
  );
}
