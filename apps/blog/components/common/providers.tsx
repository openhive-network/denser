import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import Layout from './layout';
import { SWRConfig } from 'swr';
import { useRouter } from 'next/router';
import { getLogger } from '@ui/lib/logging';
import { fetchJson } from '@/blog/lib/fetch-json';

const logger = getLogger('app');
const queryClient = new QueryClient();

const Providers = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  return (
    <SWRConfig
      value={{
        fetcher: fetchJson,
        onError: (err) => {
          logger.error('Error in SWR', err);
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {router.asPath.includes('/login') ? children : <Layout>{children}</Layout>}
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SWRConfig>
  );
};

export default Providers;
