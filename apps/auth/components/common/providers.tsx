import type { ReactNode } from "react";
import { ThemeProvider } from "../theme-provider";
import Layout from "./layout";
import { SWRConfig } from 'swr'
import { fetchJson } from '@/auth/lib/fetch-json'

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <SWRConfig
      value={{
        fetcher: fetchJson,
        onError: (err) => {
          console.error('Error in SWR', err)
        },
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Layout>{children}</Layout>
      </ThemeProvider>
    </SWRConfig>
  );
};

export default Providers;
