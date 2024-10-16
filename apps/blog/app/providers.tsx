'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MDXComponents, MDXProvider } from 'next-mdx-remote-client';
import { SignerProvider } from '../components/common/signer';
import { ExternalLink } from 'lucide-react';
import { ReactNode } from 'react';
import { checkLinks, getYoutubeaFromLink } from '../components/renderer/lib/links-checker';
import YoutubeEmbed from '../components/renderer/components/embed-youtube';
import { LeavePageDialog } from '../components/renderer/components/leave-page-dialog';

const ExternalSaftyLink = ({ href, children }: { href: string; children: ReactNode }) => {
  return (
    <a href={href}>
      <span className="cursor-pointer text-destructive">{children}</span>
      <ExternalLink className="inline h-4 w-4 cursor-pointer pl-1 text-destructive" />
    </a>
  );
};
const components: MDXComponents = {
  a: ({ href, children, ...props }) => {
    const url = href ?? '';
    const youtube = getYoutubeaFromLink(url);
    if (youtube) return <YoutubeEmbed url={youtube.url} id={youtube.id} isShorts={youtube.isShorts} />;

    const linkProtection = checkLinks(url);
    switch (linkProtection) {
      case 'internal':
        return <a href={href} {...props} children={children} />;
      case 'phishy':
        return <span>{href}</span>;
      case 'external':
        return <ExternalSaftyLink href={url} children={children} />;
      default:
        return <LeavePageDialog link={url} children={children} />;
    }
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
