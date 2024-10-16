'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MDXComponents, MDXProvider } from 'next-mdx-remote-client';
import { SignerProvider } from '../components/common/signer';
import { ExternalLink } from 'lucide-react';
import { ReactNode } from 'react';
import { checkLinks } from '../components/renderer/lib/links-checker';

const components: MDXComponents = {
  a: ({ href, children, ...props }) => {
    const linkProtection = checkLinks(href ?? '');
    if (linkProtection === 'internal') {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    }
    if (linkProtection === 'phishy') {
      return <span {...props}>{href}</span>;
    } else
      return (
        <a href={href} target="_blank">
          <span>{children}</span>
          <ExternalLink className="inline h-4 w-4 pl-1" />
        </a>
      );
  },
  wrapper: ({ children }: { children: ReactNode }) => <div className="mdx-wrapper">{children}</div>
};
export const Providers = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SignerProvider>
        <MDXProvider components={components}>{children}</MDXProvider>
      </SignerProvider>
    </QueryClientProvider>
  );
};
