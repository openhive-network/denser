import {RendererPlugin} from './RendererPlugin';

/** Instagram Embed API interface */
interface InstagramEmbedApi {
    Embeds: {
        process(): void;
    };
}

declare global {
    interface Window {
        instgrm?: InstagramEmbedApi;
    }
}

/** Maximum number of rendered posts to cache (LRU-style cleanup) */
const MAX_CACHED_POSTS = 100;

/** Delay in ms before attempting to render a post */
const POST_RENDER_DELAY_MS = 100;

/**
 * Plugin for rendering Instagram embeds in the document.
 * Handles both posts and profile URLs, with support for dark mode.
 *
 * Features:
 * - Automatic script loading for Instagram embed API
 * - Dark mode detection and support
 * - LRU-style cache cleanup to prevent memory leaks
 * - Duplicate post handling with unique container IDs
 */
export class InstagramPlugin implements RendererPlugin {
    /** Set of container IDs for Instagram posts that have been rendered to prevent duplicate rendering */
    private renderedPosts = new Set<string>();
    /** Flag indicating whether the Instagram embed script has been loaded */
    private scriptLoaded = false;
    /** Map to track link counts for handling duplicates */
    private linkCounts = new Map<string, number>();
    /** Plugin identifier */
    name = 'instagram';

    /**
     * Initializes the Instagram plugin and loads the embed script if in browser environment
     */
    constructor() {
        if (typeof window !== 'undefined') {
            void this.loadInstagramScript();
        }
    }

    /**
     * Loads the Instagram embed script if it hasn't been loaded already.
     * @returns Promise that resolves when script is loaded
     */
    private loadInstagramScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.scriptLoaded || window?.instgrm) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://www.instagram.com/embed.js';
            script.async = true;
            script.onload = () => {
                this.scriptLoaded = true;
                this.processQueuedPosts();
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Instagram embed script'));
            document.head.appendChild(script);
        });
    }

    /**
     * Triggers Instagram's embed processing for queued posts
     */
    private processQueuedPosts(): void {
        window.instgrm?.Embeds?.process();
    }

    /**
     * Cleans up old entries from the rendered posts cache to prevent memory leaks.
     */
    private cleanupCache(): void {
        if (this.renderedPosts.size > MAX_CACHED_POSTS) {
            const iterator = this.renderedPosts.values();
            const toRemove = Math.floor(MAX_CACHED_POSTS * 0.2);
            for (let i = 0; i < toRemove; i++) {
                const next = iterator.next();
                if (!next.done) {
                    this.renderedPosts.delete(next.value);
                }
            }
        }
    }

    /**
     * Renders an Instagram post in the specified container
     * @param url - The Instagram post URL to embed
     * @param containerId - The DOM element ID where the post should be rendered
     */
    private renderPost(url: string, containerId: string): void {
        if (typeof window === 'undefined') return;
        if (this.renderedPosts.has(containerId)) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        this.cleanupCache();
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
                    <a href="${url}" target="_blank" rel="noopener noreferrer">
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
     * Clears all cached state. Useful for testing or when navigation occurs.
     */
    public clearCache(): void {
        this.renderedPosts.clear();
        this.linkCounts.clear();
    }

    /**
     * Pre-processes text to identify Instagram URLs and marks them for embedding
     * @param text - The input text to process
     * @returns The processed text with Instagram URLs marked for embedding
     */
    preProcess = (text: string): string => {
        if (typeof window === 'undefined') {
            this.linkCounts.clear();
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
        return text.replace(/<div>instagram-url-(.*?)-count-(.*?)<\/div>/g, (_match, encodedUrl, count) => {
            const url = decodeURIComponent(encodedUrl);
            const postMatch = url.match(/\/(p|reel|reels)\/([^/?]+)/);
            const postId = postMatch ? postMatch[2] : 'unknown';
            const containerId = `instagram-${postId}-${count}`;

            if (typeof window !== 'undefined') {
                requestAnimationFrame(() => {
                    setTimeout(() => this.renderPost(url, containerId), POST_RENDER_DELAY_MS);
                });
            }

            return `<div id="${containerId}" class="instagram-embed"><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`;
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
