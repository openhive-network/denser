'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MDXComponents, MDXProvider } from 'next-mdx-remote-client';
import { SignerProvider } from '../components/common/signer';
import { ExternalLink } from 'lucide-react';

interface ProvidersProps {
  children: React.ReactNode;
}
const components: MDXComponents = {
  // YouTubeEmbed,
  a: ({ href, children, ...props }) => {
    // if (!href?.includes('hive.blog')) {
    return (
      <a href={href} target="_blank">
        <span>{children}</span>
        <ExternalLink className="inline h-4 w-4 pl-1" />
      </a>
    );
    // } else <a href={href} {...props} />;
  },
  wrapper: ({ children }: { children: React.ReactNode }) => <div className="mdx-wrapper">{children}</div>
};
export const Providers = ({ children }: ProvidersProps) => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SignerProvider>
        <MDXProvider components={components}>{children}</MDXProvider>
      </SignerProvider>
    </QueryClientProvider>
  );
};
