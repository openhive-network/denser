import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme-provider';
import I18nProvider from 'next-translate/I18nProvider';
import Layout from './layout';
import { createContext, useEffect, useState } from 'react';
import DynamicNamespaces from 'next-translate/DynamicNamespaces';
import { useLocalStorage } from '@/blog/components/hooks/use-local-storage';
import { siteConfig } from '@ui/config/site';

const queryClient = new QueryClient();

export const LangContext = createContext<any>(null);

const Providers = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState('en');
  const [_, setLocalStorageLang] = useLocalStorage('hive-blog-lang', lang);

  useEffect(() => {
    setLocalStorageLang(lang);
  }, [lang, setLocalStorageLang]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <LangContext.Provider value={[lang, setLang]}>
          <I18nProvider lang={lang} key={lang}>
            <DynamicNamespaces namespaces={['common_blog']} fallback='Loading...'>
              <Layout>{children}</Layout>
            </DynamicNamespaces>
          </I18nProvider>
        </LangContext.Provider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
