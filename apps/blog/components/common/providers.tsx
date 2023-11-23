import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import Layout from './layout';
import { SWRConfig } from 'swr'
import { getLogger } from "@hive/ui/lib/logging";
import { fetchJson } from '@/blog/lib/fetch-json';

const logger = getLogger('app');
const queryClient = new QueryClient();

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <SWRConfig
      value={{
        fetcher: fetchJson,
        onError: (err) => {
          logger.error('Error in SWR', err)
        },
      }}
    >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <Layout>{children}</Layout>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </SWRConfig>

  );
};

export default Providers;
