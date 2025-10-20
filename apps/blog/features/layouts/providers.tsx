'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { FC, PropsWithChildren, useMemo } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { SignerProvider } from '@hive/smart-signer/components/signer-provider';
import { getQueryClient } from '@/blog/lib/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LoggedUserProvider } from '@/blog/features/votes/hooks/use-logged-user';
import { ThemeProvider } from '@/blog/features/layouts/theme-provider';

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useMemo(() => getQueryClient(), []);
  const { resolvedTheme } = useTheme();

  return (
    <>
      <Head>
        <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SignerProvider>
            <LoggedUserProvider>{children}</LoggedUserProvider>
          </SignerProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  );
};
