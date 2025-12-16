import {RendererPlugin} from './RendererPlugin';

/** Twitter Widget API interface */
interface TwitterWidgetApi {
    widgets: {
        createTweet(tweetId: string, container: HTMLElement, options?: {theme?: 'light' | 'dark'}): Promise<HTMLElement | null>;
    };
    ready(callback: () => void): void;
}

declare global {
    interface Window {
        twttr?: TwitterWidgetApi;
    }
}

/** Maximum number of rendered tweets to cache (LRU-style cleanup) */
const MAX_CACHED_TWEETS = 100;

/** Delay in ms before attempting to render a tweet (allows container to be in DOM) */
const TWEET_RENDER_DELAY_MS = 100;

/**
 * Plugin for handling Twitter/X embedded tweets in the renderer.
 * Converts tweet URLs into embedded tweet widgets using Twitter's widget API.
 *
 * Features:
 * - Automatic script loading for Twitter widget API
 * - Dark mode detection and support
 * - LRU-style cache cleanup to prevent memory leaks
 * - Duplicate tweet handling with unique container IDs
 */
export class TwitterPlugin implements RendererPlugin {
    /** Set of container IDs for tweets that have been rendered to prevent duplicate rendering */
    private renderedTweets = new Set<string>();
    /** Flag indicating whether the Twitter widget script has been loaded */
    private scriptLoaded = false;
    /** Map to track the count of each tweet ID for handling duplicates */
    private tweetCounts = new Map<string, number>();
    /** Plugin identifier */
    name = 'twitter';

    /**
     * Initializes the Twitter plugin and loads the Twitter widget script if in browser environment
     */
    constructor() {
        if (typeof window !== 'undefined') {
            void this.loadTwitterScript();
        }
    }

    /**
     * Loads the Twitter widget script if it hasn't been loaded already.
     * The script is required for rendering embedded tweets.
     *
     * @returns Promise that resolves when script is loaded or rejects on error
     */
    private loadTwitterScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.scriptLoaded || window?.twttr) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => {
                this.scriptLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Twitter widget script'));
            document.head.appendChild(script);
        });
    }

    /**
     * Cleans up old entries from the rendered tweets cache to prevent memory leaks.
     * Uses a simple FIFO approach - removes oldest entries when cache exceeds max size.
     */
    private cleanupCache(): void {
        if (this.renderedTweets.size > MAX_CACHED_TWEETS) {
            const iterator = this.renderedTweets.values();
            // Remove oldest 20% of entries
            const toRemove = Math.floor(MAX_CACHED_TWEETS * 0.2);
            for (let i = 0; i < toRemove; i++) {
                const next = iterator.next();
                if (!next.done) {
                    this.renderedTweets.delete(next.value);
                }
            }
        }
    }

    /**
     * Renders a tweet in the specified container using Twitter's widget API
     *
     * @param id - The tweet ID to render
     * @param containerId - The ID of the container element where the tweet should be rendered
     */
    private renderTweet(id: string, containerId: string): void {
        if (typeof window === 'undefined') return;

        if (this.renderedTweets.has(containerId)) return;

        this.cleanupCache();
        this.renderedTweets.add(containerId);

        const container = document.getElementById(containerId);
        if (!container || !window?.twttr?.widgets) return;

        container.innerHTML = '';
        const isDarkMode = container.closest('.dark') !== null;

        window.twttr.widgets
            .createTweet(id, container, {
                theme: isDarkMode ? 'dark' : 'light'
            })
            .then((el: HTMLElement | null) => {
                if (!el) {
                    this.renderedTweets.delete(containerId);
                }
            })
            .catch(() => {
                this.renderedTweets.delete(containerId);
            });
    }

    /**
     * Clears all cached state. Useful for testing or when navigation occurs.
     */
    public clearCache(): void {
        this.renderedTweets.clear();
        this.tweetCounts.clear();
    }
    /**
     * Pre-processes text to convert Twitter/X URLs into temporary placeholder elements.
     * Matches both twitter.com and x.com URLs and extracts the tweet ID and author.
     *
     * @param text - The input text containing potential Twitter/X URLs
     * @returns Text with Twitter/X URLs replaced with placeholder div elements
     */
    preProcess: (text: string) => string = (text: string) => {
        if (typeof window === 'undefined') {
            this.tweetCounts.clear(); // Clear counts in non-browser environments
        }

        return text.replace(
            /(?<!\()(https?:\/\/)?(?:www\.)?(twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)[^)\s]*/g,
            (_match, _protocol, _domain, author, _status, id) => {
                const count = (this.tweetCounts.get(id) || 0) + 1;
                this.tweetCounts.set(id, count);
                const indexSuffix = count > 1 ? `${count}` : '';
                return `&nbsp;<div>twitter-id-${id}-author-${author}-count-${indexSuffix}</div>&nbsp;`;
            }
        );
    };

    /**
     * Post-processes text by replacing placeholder elements with actual tweet embeds.
     * Creates unique container IDs for each tweet and triggers the tweet rendering process.
     *
     * @param text - The text containing Twitter placeholder elements
     * @returns Text with placeholder elements replaced with tweet embed containers
     */
    postProcess: (text: string) => string = (text: string) => {
        return text.replace(/<div>twitter-id-(\d+)-author-(\w+)-count-([^<]*)<\/div>/g, (_match, id, author, indexSuffix) => {
            const containerId = `tweet-${id}-${indexSuffix}`;
            const url = `https://x.com/${author}/status/${id}`;

            if (typeof window !== 'undefined' && window.twttr?.ready) {
                // Use requestAnimationFrame for better performance than setTimeout
                // This ensures the container is in the DOM before rendering
                requestAnimationFrame(() => {
                    setTimeout(() => this.renderTweet(id, containerId), TWEET_RENDER_DELAY_MS);
                });
            }

            return `<div id="${containerId}" class="twitter-tweet"><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`;
        });
    };
}
