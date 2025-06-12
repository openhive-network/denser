import { FC, useEffect } from 'react';
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
  useEffect(() => {
    // Load Instagram embed script if not already loaded
    if (!window.instgrm) {
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      };
      document.head.appendChild(script);
    } else {
      // If script is already loaded, process embeds
      window.instgrm.Embeds.process();
    }
  }, [href]);

  return (
    <blockquote className="instagram-media" data-instgrm-permalink={href}>
      <a href={href} target="_blank" rel="noopener noreferrer"></a>
    </blockquote>
  );
};

// Add type declaration for Instagram embed
declare global {
  interface Window {
    instgrm?: any;
  }
}
