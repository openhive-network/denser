import 'highlight.js/styles/github.css';
import 'remark-github-blockquote-alert/alert.css';
import { useState, useEffect, createElement } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { cn } from '@ui/lib/utils';
import { getXMetadataFromLink, TwitterEmbedder } from './embeds/twitter-x';
import { LeavePageDialog } from './leave-page-dialog';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getYoutubeaFromLink, YoutubeEmbed } from './embeds/youtube';
import { getTwitchMetadataFromLink, TwitchEmbed } from './embeds/twitch';
import { getThreespeakMetadataFromLink, ThreeSpeakEmbed } from './embeds/threespeak';
import { getInstagramMetadataFromLink, InstagramEmbedder } from './embeds/instagram';
import LinkHeader from './link-header';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';

import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkSubSup from './plugins/remark-sub-sup';
import remarkMath from 'remark-math';
import remarkAlert from 'remark-github-blockquote-alert';
import remarkParse from 'remark-parse';
import remarkFlexibleParagraphs from 'remark-flexible-paragraphs';
import remarkFlexibleMarkers from 'remark-flexible-markers';
import remarkInternalLinks from './plugins/remark-internal-links';
import remarkRehype from 'remark-rehype';

import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeLinkHandler from './plugins/rehype-link-handler';

export default function Renderer({ content, className }: { content: string; className?: string }) {
  return (
    <>
      <div className={cn('prose h-full max-w-none p-2 dark:prose-invert', className)}>
        <ReactMarkdown
          components={components}
          remarkPlugins={[
            remarkParse,
            remarkBreaks,
            remarkInternalLinks,
            remarkFlexibleParagraphs,
            remarkFlexibleMarkers,
            remarkAlert,
            remarkMath,
            remarkSubSup,
            [remarkGfm, { singleTilde: false, subscript: true, superscript: true }],
            remarkRehype
          ]}
          rehypePlugins={[
            rehypeStringify,
            rehypeRaw,
            rehypeKatex,
            rehypeHighlight,
            rehypeMathjax,
            rehypeLinkHandler,
            [
              rehypeSanitize,
              {
                attributes: {
                  '*': ['style', 'className', 'class', 'id'],
                  a: ['href', 'title'],
                  img: ['src', 'alt'],
                  input: ['checked'],
                  th: ['align', 'style'],
                  td: ['align', 'style'],
                  table: ['style'],
                  thead: ['style'],
                  tbody: ['style'],
                  tr: ['style']
                },
                tagNames: [
                  'span',
                  'div',
                  'p',
                  'a',
                  'ul',
                  'ol',
                  'li',
                  'h1',
                  'h2',
                  'h3',
                  'h4',
                  'h5',
                  'h6',
                  'u',
                  'strong',
                  'em',
                  'blockquote',
                  'code',
                  'pre',
                  'img',
                  'table',
                  'thead',
                  'tbody',
                  'tr',
                  'th',
                  'td',
                  'sub',
                  'sup',
                  'mark',
                  'br',
                  'input',
                  'center'
                ]
              }
            ]
          ]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
}

const components: Components = {
  ...(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).reduce((acc, tag) => {
    acc[tag] = ({ children, ...props }: any) => (
      <LinkHeader id={children?.toString()}>{createElement(tag, props, children)}</LinkHeader>
    );
    return acc;
  }, {} as Components),
  img: ({ src, ...props }) => {
    if (!src) return;
    const imageProxy = getDoubleSize(proxifyImageUrl(src, true).replace(/ /g, '%20'));
    return <img src={imageProxy} {...props} />;
  },
  a: ({ href, children, download, type, className, ...props }) => {
    const url = href ?? '';
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    if (!isClient) {
      return (
        <Link href={url} {...props}>
          {children}
        </Link>
      );
    }
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
    if (imageExtensions.some((ext) => url.toLowerCase().endsWith(ext))) {
      const imageProxy = getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20'));
      return <img src={imageProxy} alt={children?.toString()} />;
    }

    const twitch = getTwitchMetadataFromLink(url);
    if (twitch) {
      return (
        <div key={`twitch-embed-${twitch}`}>
          <TwitchEmbed url={twitch} />
        </div>
      );
    }

    const threeSpeak = getThreespeakMetadataFromLink(url);
    if (threeSpeak) {
      return (
        <div key={`threespeak-embed-${threeSpeak}`} suppressHydrationWarning>
          <ThreeSpeakEmbed id={threeSpeak} />
        </div>
      );
    }

    const instagram = getInstagramMetadataFromLink(url);
    if (instagram) {
      return (
        <div key={`instagram-embed-${instagram}`} suppressHydrationWarning>
          <InstagramEmbedder href={instagram} />
        </div>
      );
    }

    const youtube = getYoutubeaFromLink(url);
    if (youtube) {
      return (
        <div key={`youtube-embed-${youtube.id}`} suppressHydrationWarning>
          <YoutubeEmbed url={youtube.url} id={youtube.id} />
        </div>
      );
    }

    const x = getXMetadataFromLink(url);
    if (x) {
      return (
        <div key={`twitter-embed-${x.id}`} suppressHydrationWarning>
          <TwitterEmbedder id={x.id} username={x.username} />
        </div>
      );
    }

    if (className?.includes('link-external')) {
      if (className?.includes('safe-external-link')) {
        return (
          <Link href={url} target="_blank">
            <span>{children}</span>
            <ExternalLink className="inline h-4 w-4 cursor-pointer pl-1 text-destructive" />
          </Link>
        );
      }
      if (className?.includes('unknown-external-link')) {
        return (
          <>
            <LeavePageDialog link={url} {...props}>
              {children}
            </LeavePageDialog>
            <ExternalLink className="inline h-4 w-4 cursor-pointer pl-1 text-destructive" />
          </>
        );
      }
    }

    return (
      <Link href={url} {...props}>
        {children}
      </Link>
    );
  }
};
