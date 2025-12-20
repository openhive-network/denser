import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        instgrm?: any;
    }
}

/** Parsed Instagram post/reel data */
interface InstagramPostData {
    type: 'p' | 'reel';
    id: string;
}

/**
 * Plugin for rendering Instagram embeds in the document.
 * Handles both posts and profile URLs, with support for dark mode.
 */
export class InstagramPlugin implements RendererPlugin {
    /** Valid Instagram shortcode: Base64URL, typically 11 chars (allow 10-14 for safety) */
    private static readonly VALID_ID = /^[a-zA-Z0-9_-]{10,14}$/;

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
     * Parses an Instagram URL and extracts validated post data.
     * Returns null if URL is invalid or ID doesn't match expected format.
     * @param url - The Instagram URL to parse
     * @returns Parsed post data or null if invalid
     * @private
     */
    private parseInstagramUrl(url: string): InstagramPostData | null {
        if (!url) return null;

        const match = url.match(
            /^https:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(?<type>p|reels?)\/(?<id>[^/?#]+)/i
        );

        const id = match?.groups?.id;
        if (!id || !InstagramPlugin.VALID_ID.test(id)) {
            return null;
        }

        return {
            type: match.groups!.type.includes('reel') ? 'reel' : 'p',
            id
        };
    }

    /**
     * Builds a safe Instagram URL from validated components.
     * @param type - Post type ('p' or 'reel')
     * @param id - Validated post ID
     * @returns Reconstructed Instagram URL
     * @private
     */
    private buildUrl(type: 'p' | 'reel', id: string): string {
        return `https://www.instagram.com/${type}/${id}/`;
    }

    /**
     * Renders an Instagram post in the specified container using DOM APIs.
     * @param postData - Validated Instagram post data
     * @param containerId - The DOM element ID where the post should be rendered
     * @private
     */
    private renderPost(postData: InstagramPostData, containerId: string) {
        if (typeof window === 'undefined') return;
        if (this.renderedPosts.has(containerId)) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        this.renderedPosts.add(containerId);
        const url = this.buildUrl(postData.type, postData.id);
        const isDarkMode = container.closest('.dark') !== null;

        // Use DOM APIs instead of innerHTML to prevent XSS
        const blockquote = document.createElement('blockquote');
        blockquote.className = 'instagram-media';
        blockquote.dataset.instgrmPermalink = url;
        blockquote.dataset.instgrmVersion = '14';
        if (isDarkMode) {
            blockquote.dataset.instgrmTheme = 'dark';
        }

        const wrapper = document.createElement('div');
        wrapper.style.padding = '16px';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Loading Instagram post...';

        wrapper.appendChild(link);
        blockquote.appendChild(wrapper);
        container.replaceChildren(blockquote);

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
            const postData = this.parseInstagramUrl(match);
            if (!postData) return match; // Invalid URL, leave as-is

            const count = (this.linkCounts.get(match) || 0) + 1;
            this.linkCounts.set(match, count);
            const indexSuffix = count > 1 ? `${count}` : '';

            // Store only validated type and id, not the original URL
            return `&nbsp;<div>instagram-embed-${postData.type}-${postData.id}-count-${indexSuffix}</div>&nbsp;`;
        });
    };

    /**
     * Post-processes text by replacing marked Instagram URLs with actual embeds
     * @param text - The pre-processed text
     * @returns The final text with Instagram embeds
     */
    postProcess = (text: string): string => {
        return text.replace(
            /<div>instagram-embed-(?<type>p|reel)-(?<id>[a-zA-Z0-9_-]{10,14})-count-(?<count>\d*)<\/div>/g,
            (_match, type: 'p' | 'reel', id: string, count: string) => {
                // Type and ID are validated by regex - safe to use in template
                const postData: InstagramPostData = {type, id};
                const url = this.buildUrl(type, id);
                const containerId = `instagram-${type}-${id}-${count}`;

                setTimeout(() => this.renderPost(postData, containerId), 1000);

                // Safe: URL reconstructed from validated type (p|reel) and id ([a-zA-Z0-9_-]{10,14})
                return `<div id="${containerId}" class="instagram-embed"><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`;
            }
        );
    };

}
