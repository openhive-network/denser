import { ReactNode } from 'react';
import Head from 'next/head';
import { Toaster } from '@ui/components/toaster';
import { useTheme } from 'next-themes';
import { TailwindIndicator } from '../tailwind-indicator';
import SiteHeader from '../site-header';
import { ModalContainer } from '@smart-signer/components/modal-container';

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
        <div className="flex-1 bg-background">{children}</div>
      </div>
      <ModalContainer />
      <Toaster />
      <TailwindIndicator />
    </>
  );
}

export default Layout;
