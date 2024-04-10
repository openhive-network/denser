import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import Layout from './layout';
import { HiveContentRendererProvider } from '../hive-renderer-context';
import { SignerProvider } from './signer';

const queryClient = new QueryClient();

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <HiveContentRendererProvider>
          <SignerProvider>
            <Layout>{children}</Layout>
          </SignerProvider>
        </HiveContentRendererProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
