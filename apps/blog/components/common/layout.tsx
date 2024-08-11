import { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import { Toaster } from '@ui/components/toaster';
import { useTheme } from 'next-themes';
import { TailwindIndicator } from '../tailwind-indicator';
import SiteHeader from '../site-header';
import { ModalContainer } from '@smart-signer/components/modal-container';
import RocketChatWidget from '../rocket-chat-widget';
import { siteConfig } from '@ui/config/site';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { resolvedTheme } = useTheme();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <Head>
        <meta name="theme-color" content={resolvedTheme === 'dark' ? '#030711' : '#ffffff'} />
      </Head>
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader />
        <div className="bg-background-secondary flex-1">{children}</div>
      </div>
      {isClient && siteConfig.openhiveChatIframeIntegrationEnable === 'yes' && <RocketChatWidget />}
      <ModalContainer />
      <Toaster />
      <TailwindIndicator />
    </>
  );
}

export default Layout;
