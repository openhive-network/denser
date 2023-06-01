import { ReactNode } from 'react';
import Head from 'next/head';
import { Toaster } from '@/components/ui/toaster';
import { useTheme } from 'next-themes';
import SiteHeader from '@/components/site-header';
import { TailwindIndicator } from '@/components/tailwind-indicator';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <Head>
        <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
      </Head>
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1 bg-slate-50 dark:bg-background/95">{children}</div>
      </div>
      <Toaster />
      <TailwindIndicator />
    </>
  );
}

export default Layout;
