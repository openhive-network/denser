import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        instgrm?: any;
    }
}

// Instagram plugin
export class InstagramPlugin implements RendererPlugin {
    private renderedPosts = new Set<string>();
    private scriptLoaded = false;
    // Plugin name
    name = 'instagram';

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadInstagramScript();
        }
    }
    // Load Instagram embed script
    private loadInstagramScript() {
        if (this.scriptLoaded || window?.instgrm) return;

        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        script.onload = () => {
            this.scriptLoaded = true;
            this.processQueuedPosts();
        };
        document.head.appendChild(script);
    }

    // Process queued Instagram posts
    private processQueuedPosts() {
        window.instgrm?.Embeds?.process();
    }

    // Render Instagram post
    private renderPost(url: string, containerId: string) {
        if (typeof window === 'undefined') return;
        if (this.renderedPosts.has(containerId)) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        this.renderedPosts.add(containerId);
        const isDarkMode = container.closest('.dark') !== null;
        container.innerHTML = `
      <blockquote 
        class="instagram-media" 
        data-instgrm-permalink="${url}"
        data-instgrm-version="14"
        ${isDarkMode ? 'data-instgrm-theme="dark"' : ''}
      >
        <div style="padding:16px;">
          <a 
            href="${url}" 
            target="_blank"
            rel="noopener noreferrer"
          >
            Loading Instagram post...
          </a>
        </div>
      </blockquote>
    `;

        if (this.scriptLoaded) {
            this.processQueuedPosts();
        }
    }

    // Pre-process the text before rendering
    preProcess = (text: string): string => {
        // Match Instagram URLs
        return text.replace(/(https?:\/\/(www\.)?instagram\.com\/[^\s]+)/g, (match) => {
            const embedUrl = this.getInstagramMetadataFromLink(match);
            return embedUrl ? `<div>instagram-url-${encodeURIComponent(embedUrl)}</div>` : match;
        });
    };

    // Post-process the text after rendering
    postProcess = (text: string): string => {
        // Replace Instagram URLs with embeds
        return text.replace(/<div>instagram-url-(.*?)<\/div>/g, (_match, encodedUrl) => {
            const url = decodeURIComponent(encodedUrl);
            const containerId = `instagram-${Math.random().toString(36).substring(7)}`;

            setTimeout(() => this.renderPost(url, containerId), 0);
            return `<div id="${containerId}" class="instagram-embed"></div>`;
        });
    };

    // Get Instagram metadata from the link
    private getInstagramMetadataFromLink(link: string): string | undefined {
        if (!link) return undefined;
        // Match profile URLs
        const profileMatch = link.match(/^https:\/\/www\.instagram\.com\/([a-zA-Z0-9_.]+)\/?$/i);
        if (profileMatch) {
            return profileMatch[0];
        }

        // Match post/reel URLs
        const postMatch = link.match(/^https:\/\/www\.instagram\.com\/(?:[a-zA-Z0-9_.]+\/)?(?<type>p|reel|reels)\/(?<id>[^/?]+)/i);
        if (postMatch) {
            const id = postMatch.groups?.id || '';
            const type = postMatch.groups?.type.includes('reel') ? 'reel' : 'p';
            return `https://www.instagram.com/${type}/${id}`;
        }
        return undefined;
    }
}
