'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignerProvider } from '../components/common/signer';
import { ReactNode } from 'react';
import RendererProvider from '../components/renderer/components/renderer-provider';
import { ThemeProvider } from '../components/theme-provider';

export const Providers = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SignerProvider>
          <RendererProvider>{children}</RendererProvider>
        </SignerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
