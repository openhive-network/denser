import { MDXComponents, MDXProvider } from 'next-mdx-remote-client';
import { ReactNode } from 'react';
import { checkLinks } from '../lib/links-checker';
import { getInstagramMetadataFromLink, InstagramEmbedder } from './embed-instagram';
import { getThreespeakMetadataFromLink, ThreeSpeakEmbed } from './embed-threespeak';
import { getTwitchMetadataFromLink, TwitchEmbed } from './embed-twitch';
import { getXMetadataFromLink, TwitterEmbedder } from './embed-x';
import { getYoutubeaFromLink, YoutubeEmbed } from './embed-youtube';
import { LeavePageDialog } from './leave-page-dialog';
import { ExternalLink } from 'lucide-react';

const components: MDXComponents = {
  a: ({ href, children, download, type, ...props }) => {
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
    if (youtube) return <YoutubeEmbed url={youtube.url} id={youtube.id} />;

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

const ExternalSaftyLink = ({ href, children }: { href: string; children: ReactNode }) => {
  return (
    <a href={href}>
      <span className="cursor-pointer text-destructive">{children}</span>
      <ExternalLink className="inline h-4 w-4 cursor-pointer pl-1 text-destructive" />
    </a>
  );
};

const RendererProvider = ({ children }: { children: ReactNode }) => {
  return <MDXProvider components={components}>{children}</MDXProvider>;
};

export default RendererProvider;
