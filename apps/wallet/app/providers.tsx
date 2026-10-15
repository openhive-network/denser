'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FC, PropsWithChildren, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { SignerProviderClient } from '@smart-signer/components/signer-provider-client';
import { RequiredKeyTypeContext } from '@smart-signer/lib/auth/required-key-type';
import { KeyType } from '@smart-signer/types/common';
import { getQueryClient } from '@/wallet/lib/react-query';
import { ThemeProvider } from '@/wallet/components/theme-provider';
import SiteHeader from '@/wallet/components/site-header';
import { ActiveKeyRequiredNotice } from '@/wallet/components/active-key-required-notice';
import { ModalContainer } from '@smart-signer/components/modal-container';
import { Toaster } from '@ui/components/toaster';
import { TailwindIndicator } from '@/wallet/components/tailwind-indicator';

// Importing the module initializes i18next for client components; it must happen before any
// component calls useTranslation
import { useTranslation } from '@/wallet/i18n/client';

/** `nonce`: this response's CSP nonce, for the theme's inline init script */
export const Providers: FC<PropsWithChildren<{ nonce?: string }>> = ({ children, nonce }) => {
  const queryClient = useMemo(() => getQueryClient(), []);
  const { t } = useTranslation('common_wallet');

  return (
    <QueryClientProvider client={queryClient}>
      {/* The wallet signs with the active key: a posting-key session from the blog on this origin is not a wallet login */}
      <RequiredKeyTypeContext.Provider value={KeyType.active}>
        <SignerProviderClient>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
            <ThemeColorMeta />
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <ActiveKeyRequiredNotice />
              <div className="flex-1">{children}</div>
            </div>
          </ThemeProvider>
        </SignerProviderClient>
        <ModalContainer />
      </RequiredKeyTypeContext.Provider>
      <Toaster label={t('global.notifications_region')} />
      <ReactQueryDevtools initialIsOpen={false} />
      <TailwindIndicator />
    </QueryClientProvider>
  );
};

/**
 * Sets the theme-color meta tag based on current theme.
 * Extracted to avoid useTheme() at the Providers level (before ThemeProvider).
 * Uses useEffect to update the meta tag in App Router (next/head doesn't work in App Router).
 */
function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#030711' : '#ffffff';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
  }, [resolvedTheme]);

  return null;
}
