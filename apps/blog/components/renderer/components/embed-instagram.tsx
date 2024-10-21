import { FC } from 'react';
const regex = /^https:\/\/www\.instagram\.com\/(p|reel|reels|[a-zA-Z0-9_.]+)\/(.*?)\/?$/i;

export function getInstagramMetadataFromLink(link: string): string | undefined {
  if (!link) return undefined;

  const match = link.match(regex);
  if (!match) return undefined;
  const [_, type, id] = match;

  if (id.startsWith('p/')) return `https://www.instagram.com/${id}`;

  if (type.includes('reel')) return `https://www.instagram.com/reel/${id}`;

  return match[0];
}
export const InstagramEmbedder: FC<{ href: string }> = ({ href }) => {
  return (
    <>
      <blockquote className="instagram-media" data-instgrm-permalink={href}>
        <a href={href} target="_blank"></a>
      </blockquote>
      <script async src="//www.instagram.com/embed.js"></script>
    </>
  );
};
