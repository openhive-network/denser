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
    /** Set of container IDs for Instagram posts that have been rendered to prevent duplicate rendering */
    private renderedPosts = new Set<string>();
    /** Flag indicating whether the Instagram embed script has been loaded */
    private scriptLoaded = false;
    /** Identifier for the plugin, used to register and identify the plugin in the renderer */
    private linkCounts = new Map<string, number>();
    /** Plugin identifier */
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
     * Loads the Instagram embed script if it hasn't been loaded already.
     * @private
     */
    private loadInstagramScript() {
        if (!this.scriptLoaded || !window?.instgrm) {
            const script = document.createElement('script');
            script.src = 'https://www.instagram.com/embed.js';
            script.async = true;
            script.onload = () => {
                this.scriptLoaded = true;
                this.processQueuedPosts();
            };
            document.head.appendChild(script);
        }
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
        if (typeof window === 'undefined') {
            this.linkCounts.clear(); // Clear counts in non-browser environments
        }
        // Match Instagram URLs not wrapped in parentheses
        return text.replace(/(?<!\()(https?:\/\/(www\.)?instagram\.com\/[^\s)]+)/g, (match) => {
            const count = (this.linkCounts.get(match) || 0) + 1;
            this.linkCounts.set(match, count);
            const indexSuffix = count > 1 ? `${count}` : '';
            const embedUrl = this.getInstagramMetadataFromLink(match);
            return embedUrl ? `&nbsp;<div>instagram-url-${encodeURIComponent(embedUrl)}-count-${indexSuffix}</div>&nbsp;` : match;
        });
    };

    /**
     * Post-processes text by replacing marked Instagram URLs with actual embeds
     * @param text - The pre-processed text
     * @returns The final text with Instagram embeds
     */
    postProcess = (text: string): string => {
        // Replace Instagram URLs with embeds
        return text.replace(/<div>instagram-url-(.*?)-count-(.*?)<\/div>/g, (_match, encodedUrl, count) => {
            const url = decodeURIComponent(encodedUrl);
            const match = url.match(/\/(p|reel|reels)\/([^/?]+)/);
            if (!match || !match[2]) {
                return `<a href="${url}" target="_blank">${url}</a>`;
            }
            const containerId = `instagram-${match[2]}-${count}`;
            setTimeout(() => this.renderPost(url, containerId), 1000);
            return `<div id="${containerId}" class="instagram-embed"><a href="${url}" target="_blank">${url}</a></div>`;
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
