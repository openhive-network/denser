import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Hydrate } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import Layout from './layout';
import { LoggedUserProvider } from './logged-user';
import { SignerProvider } from '../../../../packages/smart-signer/components/signer-provider';

const queryClient = new QueryClient();

const Providers = ({ children, dehydratedState }: { children: ReactNode; dehydratedState?: unknown }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={dehydratedState}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SignerProvider>
            <LoggedUserProvider>
              <Layout>{children}</Layout>
            </LoggedUserProvider>
          </SignerProvider>
        </ThemeProvider>
      </Hydrate>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
