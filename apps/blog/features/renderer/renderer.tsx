import 'highlight.js/styles/github.css';
import 'remark-github-blockquote-alert/alert.css';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@ui/lib/utils';
import remarkSubSup from './plugins/remark-sub-sup';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkAlert from 'remark-github-blockquote-alert';
import remarkParse from 'remark-parse';
import rehypeMathjax from 'rehype-mathjax';
import rehypeSanitize from 'rehype-sanitize';
import remarkFlexibleParagraphs from 'remark-flexible-paragraphs';
import remarkFlexibleMarkers from 'remark-flexible-markers';
import remarkInternalLinks from './plugins/remark-internal-links';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import rehypeLinkHandler from './plugins/rehype-link-handler';
import { getXMetadataFromLink, TwitterEmbedder } from './embeds/twitter-x';
import { LeavePageDialog } from './leave-page-dialog';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getYoutubeaFromLink, YoutubeEmbed } from './embeds/youtube';
import { getTwitchMetadataFromLink, TwitchEmbed } from './embeds/twitch';
import { getThreespeakMetadataFromLink, ThreeSpeakEmbed } from './embeds/threespeak';
import { getInstagramMetadataFromLink, InstagramEmbedder } from './embeds/instagram';

export default function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
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
            [
              remarkGfm,
              {
                singleTilde: false,
                subscript: true,
                superscript: true
              }
            ],
            remarkRehype
          ]}
          rehypePlugins={[
            rehypeStringify,
            rehypeRaw,
            rehypeKatex,
            rehypeHighlight,
            rehypeMathjax,
            [
              rehypeSanitize,
              {
                attributes: {
                  '*': ['className', 'style', 'id'],
                  a: ['href', 'title'],
                  img: ['src', 'alt'],
                  input: ['checked']
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
                  'input'
                ]
              }
            ],
            rehypeLinkHandler
          ]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
}

const components: Components = {
  a: ({ href, children, download, type, className, ...props }) => {
    const url = href ?? '';
    const twitch = getTwitchMetadataFromLink(url);
    if (twitch) {
      return (
        <div key={`twitter-embed-${twitch}`} suppressHydrationWarning>
          <TwitchEmbed url={twitch} />
        </div>
      );
    }

    const threeSpeak = getThreespeakMetadataFromLink(url);
    if (threeSpeak) {
      return (
        <div key={`twitter-embed-${threeSpeak}`} suppressHydrationWarning>
          <ThreeSpeakEmbed id={threeSpeak} />
        </div>
      );
    }

    const instagram = getInstagramMetadataFromLink(url);
    if (instagram) {
      return (
        <div key={`twitter-embed-${instagram}`} suppressHydrationWarning>
          <InstagramEmbedder href={instagram} />
        </div>
      );
    }

    const youtube = getYoutubeaFromLink(url);
    if (youtube) {
      return (
        <div key={`twitter-embed-${youtube.id}`} suppressHydrationWarning>
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
