'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignerProvider } from '../components/common/signer';
import { FC, PropsWithChildren } from 'react';
import RendererProvider from '../components/renderer/components/renderer-provider';
import { ThemeProvider } from '../components/theme-provider';
import Head from 'next/head';
import { useTheme } from 'next-themes';

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = new QueryClient();
  const { resolvedTheme } = useTheme();

  return (
    <>
      <Head>
        <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SignerProvider>
            <RendererProvider>{children}</RendererProvider>
          </SignerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
};
