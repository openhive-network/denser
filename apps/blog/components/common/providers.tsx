import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import Layout from './layout';
import { SignerProvider } from '../../../../packages/smart-signer/components/signer-provider';
import { LoggedUserProvider } from './logged-user';

const queryClient = new QueryClient();

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SignerProvider>
          <LoggedUserProvider>
            <Layout>{children}</Layout>
          </LoggedUserProvider>
        </SignerProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
