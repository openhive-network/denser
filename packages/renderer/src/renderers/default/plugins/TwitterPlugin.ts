import {RendererPlugin} from './RendererPlugin';

declare global {
    interface Window {
        twttr: any;
    }
}

export class TwitterPlugin implements RendererPlugin {
    private renderedTweets = new Set<string>();
    private scriptLoaded = false;

    name = 'twitter';

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadTwitterScript();
        }
    }

    private loadTwitterScript() {
        if (!this.scriptLoaded && !window?.twttr) {
            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => (this.scriptLoaded = true);
            document.head.appendChild(script);
        }
    }

    private renderTweet(id: string, containerId: string) {
        if (typeof window === 'undefined') return;

        if (!this.renderedTweets.has(containerId)) {
            this.renderedTweets.add(containerId);
            const container = document.getElementById(containerId);
            if (container && window?.twttr?.widgets) {
                container.innerHTML = '';
                const isDarkMode = container.closest('.dark') !== null;
                console.log(isDarkMode);
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
    preProcess: (text: string) => string = (text: string) => {
        return text.replace(
            /(?:https?:\/\/)?(?:www\.)?(twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/g,
            (_match, _domain, author, _status, id) => `<div>twitter-id-${id}-author-${author}</div>`
        );
    };

    postProcess: (text: string) => string = (text: string) => {
        return text.replace(/<div>twitter-id-(\d+)-author-(\w+)<\/div>/g, (_match, id, author) => {
            const containerId = `tweet-${id}-${Math.random().toString(36).substring(7)}`;
            const url = `https://x.com/${author}/status/${id}`;

            if (window.twttr?.ready) {
                setTimeout(() => this.renderTweet(id, containerId), 0);
            }

            return `<div id="${containerId}" class="twitter-container"><a href="${url}" target="_blank">${url}</a></div>`;
        });
    };
}
