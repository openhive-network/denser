import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        twttr: any;
    }
}

/**
 * Plugin for handling Twitter/X embedded tweets in the renderer.
 * Converts tweet URLs into embedded tweet widgets using Twitter's widget API.
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
            this.loadTwitterScript();
        }
    }

    /**
     * Loads the Twitter widget script if it hasn't been loaded already.
     * The script is required for rendering embedded tweets.
     */
    private loadTwitterScript() {
        if (!this.scriptLoaded && !window?.twttr) {
            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => (this.scriptLoaded = true);
            document.head.appendChild(script);
        }
    }

    /**
     * Renders a tweet in the specified container using Twitter's widget API
     *
     * @param id - The tweet ID to render
     * @param containerId - The ID of the container element where the tweet should be rendered
     */
    private renderTweet(id: string, containerId: string) {
        if (typeof window === 'undefined') return;

        if (!this.renderedTweets.has(containerId)) {
            this.renderedTweets.add(containerId);
            const container = document.getElementById(containerId);
            if (container && window?.twttr?.widgets) {
                container.innerHTML = '';
                const isDarkMode = container.closest('.dark') !== null;
                window.twttr.widgets
                    .createTweet(id, container, {
                        theme: isDarkMode ? 'dark' : 'light'
                    })
                    .then((el: any) => {
                        if (!el) this.renderedTweets.delete(containerId);
                    });
            }
        }
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
                return `<div>twitter-id-${id}-author-${author}-count-${indexSuffix}</div>\n`;
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
                setTimeout(() => this.renderTweet(id, containerId), 1000);
            }

            return `<div id="${containerId}" class="twitter-tweet"><a href="${url}" target="_blank">${url}</a></div>`;
        });
    };
}
