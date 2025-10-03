'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FC, PropsWithChildren } from 'react';
import { ThemeProvider } from '../../components/theme-provider';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { SignerProvider } from '@hive/smart-signer/components/signer-provider';

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
          <SignerProvider>{children}</SignerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
};
