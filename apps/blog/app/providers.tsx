'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MDXComponents, MDXProvider } from 'next-mdx-remote-client';
import { SignerProvider } from '../components/common/signer';
import { ExternalLink } from 'lucide-react';
import { ReactNode } from 'react';
import { checkLinks } from '../components/renderer/lib/links-checker';
import { YoutubeEmbed, getYoutubeaFromLink } from '../components/renderer/components/embed-youtube';
import { LeavePageDialog } from '../components/renderer/components/leave-page-dialog';
import { getXMetadataFromLink, TwitterEmbedder } from '../components/renderer/components/embed-x';
import {
  getInstagramMetadataFromLink,
  InstagramEmbedder
} from '../components/renderer/components/embed-instagram';
import {
  getThreespeakMetadataFromLink,
  ThreeSpeakEmbed
} from '../components/renderer/components/embed-threespeak';
import { getTwitchMetadataFromLink, TwitchEmbed } from '../components/renderer/components/embed-twitch';

const components: MDXComponents = {
  a: ({ href, children, download, type, ...props }) => {
    console.log(JSON.stringify({ href, children, download, type, props }));
    const url = href ?? '';

    const twitch = getTwitchMetadataFromLink(url);
    if (twitch) return <TwitchEmbed url={twitch} />;

    const threeSpeak = getThreespeakMetadataFromLink(url);
    if (threeSpeak) return <ThreeSpeakEmbed id={threeSpeak} />;

    const instagram = getInstagramMetadataFromLink(url);
    if (instagram) return <InstagramEmbedder href={instagram} />;

    const x = getXMetadataFromLink(url);
    if (x) return <TwitterEmbedder id={x.id} username={x.username} />;

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

const ExternalSaftyLink = ({ href, children }: { href: string; children: ReactNode }) => {
  return (
    <a href={href}>
      <span className="cursor-pointer text-destructive">{children}</span>
      <ExternalLink className="inline h-4 w-4 cursor-pointer pl-1 text-destructive" />
    </a>
  );
};