import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        instgrm?: any;
    }
}

/**
 * Plugin for rendering Instagram embeds in the document.
 * Handles both posts and profile URLs, with support for dark mode.
 */
export class InstagramPlugin implements RendererPlugin {
    private renderedPosts = new Set<string>();
    private scriptLoaded = false;
    // Plugin name
    name = 'instagram';

    /**
     * Initializes the Instagram plugin and loads the embed script if in browser environment
     */
    constructor() {
        if (typeof window !== 'undefined') {
            this.loadInstagramScript();
        }
    }

    /**
     * Loads the Instagram embed script asynchronously
     * @private
     */
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

    /**
     * Triggers Instagram's embed processing for queued posts
     * @private
     */
    private processQueuedPosts() {
        window.instgrm?.Embeds?.process();
    }

    /**
     * Renders an Instagram post in the specified container
     * @param url - The Instagram post URL to embed
     * @param containerId - The DOM element ID where the post should be rendered
     * @private
     */
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

    /**
     * Pre-processes text to identify Instagram URLs and marks them for embedding
     * @param text - The input text to process
     * @returns The processed text with Instagram URLs marked for embedding
     */
    preProcess = (text: string): string => {
        // Match Instagram URLs not wrapped in parentheses
        return text.replace(/(?<!\()(https?:\/\/(www\.)?instagram\.com\/[^\s)]+)/g, (match) => {
            const embedUrl = this.getInstagramMetadataFromLink(match);
            return embedUrl ? `<div>instagram-url-${encodeURIComponent(embedUrl)}</div>` : match;
        });
    };

    /**
     * Post-processes text by replacing marked Instagram URLs with actual embeds
     * @param text - The pre-processed text
     * @returns The final text with Instagram embeds
     */
    postProcess = (text: string): string => {
        // Replace Instagram URLs with embeds
        return text.replace(/<div>instagram-url-(.*?)<\/div>/g, (_match, encodedUrl) => {
            const url = decodeURIComponent(encodedUrl);
            const containerId = `instagram-${Math.random().toString(36).substring(7)}`;

            setTimeout(() => this.renderPost(url, containerId), 0);
            return `<div id="${containerId}" class="instagram-embed"></div>`;
        });
    };

    /**
     * Extracts and normalizes Instagram URLs from links
     * @param link - The Instagram URL to process
     * @returns Normalized Instagram URL or undefined if invalid
     * @private
     */
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
