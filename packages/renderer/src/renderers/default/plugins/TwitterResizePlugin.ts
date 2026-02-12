import type {RendererPlugin} from './RendererPlugin';

const WIDGETS_JS_URL = 'https://platform.twitter.com/widgets.js';
const TWEET_ID_REGEX = /[?&]id=(\d+)/;

declare global {
    interface Window {
        twttr?: {
            widgets?: {
                createTweet?: (id: string, el: HTMLElement, options?: Record<string, string>) => Promise<HTMLElement | undefined>;
            };
        };
    }
}

/**
 * Plugin that replaces Twitter embed iframes with native Twitter widgets.
 * On mount, finds all .twitterWrapper iframes, extracts tweet IDs,
 * loads Twitter's widgets.js and renders tweets via twttr.widgets.createTweet().
 * This gives proper auto-sizing that iframe-only approach cannot achieve
 * (platform.twitter.com/embed/Tweet.html does not send postMessage with height).
 */
export class TwitterResizePlugin implements RendererPlugin {
    name = 'twitter-resize';

    private scriptLoading = false;

    private isWidgetsReady(): boolean {
        return typeof window.twttr?.widgets?.createTweet === 'function';
    }

    private loadWidgetsJs(): Promise<void> {
        if (this.isWidgetsReady()) return Promise.resolve();
        if (this.scriptLoading) {
            return new Promise((resolve) => {
                const check = () => {
                    if (this.isWidgetsReady()) resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }
        this.scriptLoading = true;
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = WIDGETS_JS_URL;
            script.async = true;
            script.onload = () => {
                const check = () => {
                    if (this.isWidgetsReady()) resolve();
                    else setTimeout(check, 50);
                };
                check();
            };
            document.head.appendChild(script);
        });
    }

    onMount = (rootElement: HTMLElement): (() => void) | undefined => {
        if (typeof window === 'undefined') return undefined;

        const wrappers = rootElement.querySelectorAll('.twitterWrapper');
        if (wrappers.length === 0) return undefined;

        let cancelled = false;

        const renderTweets = async () => {
            await this.loadWidgetsJs();
            if (cancelled) return;

            wrappers.forEach((wrapper) => {
                if (cancelled) return;
                const iframe = wrapper.querySelector('iframe');
                if (!iframe) return;

                const src = iframe.getAttribute('src') ?? '';
                const match = src.match(TWEET_ID_REGEX);
                if (!match?.[1]) return;

                const tweetId = match[1];
                const isDarkMode = wrapper.closest('.dark') !== null;

                iframe.remove();
                window.twttr?.widgets?.createTweet?.(tweetId, wrapper as HTMLElement, {
                    theme: isDarkMode ? 'dark' : 'light'
                });
            });
        };

        renderTweets();

        return () => {
            cancelled = true;
        };
    };
}
