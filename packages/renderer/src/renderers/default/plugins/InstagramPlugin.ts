import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        instgrm?: any;
    }
}

export class InstagramPlugin implements RendererPlugin {
    private renderedPosts = new Set<string>();
    private scriptLoaded = false;

    name = 'instagram';

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadInstagramScript();
        }
    }

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

    private processQueuedPosts() {
        window.instgrm?.Embeds?.process();
    }

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

    preProcess = (text: string): string => {
        return text.replace(/(https?:\/\/(www\.)?instagram\.com\/[^\s]+)/g, (match) => {
            const embedUrl = this.getInstagramMetadataFromLink(match);
            return embedUrl ? `<div>instagram-url-${encodeURIComponent(embedUrl)}</div>` : match;
        });
    };

    postProcess = (text: string): string => {
        return text.replace(/<div>instagram-url-(.*?)<\/div>/g, (_match, encodedUrl) => {
            const url = decodeURIComponent(encodedUrl);
            const containerId = `instagram-${Math.random().toString(36).substring(7)}`;

            setTimeout(() => this.renderPost(url, containerId), 0);

            return `<div id="${containerId}" class="instagram-embed"></div>`;
        });
    };

    private getInstagramMetadataFromLink(link: string): string | undefined {
        if (!link) return undefined;

        const match = link.match(/^https:\/\/www\.instagram\.com\/(p|reel|reels|[a-zA-Z0-9_.]+)\/(.*?)\/?$/i);
        if (!match) return undefined;

        const [_, type, id] = match;

        if (id.startsWith('p/')) return `https://www.instagram.com/${id}`;
        if (type.includes('reel')) return `https://www.instagram.com/reel/${id}`;

        return match[0];
    }
}
