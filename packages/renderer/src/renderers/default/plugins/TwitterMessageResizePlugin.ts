import type {RendererPlugin} from './RendererPlugin';

/**
 * First-party height resizing for Twitter/X embed iframes (issue #934).
 * platform.twitter.com's Tweet.html posts `twttr.embed` resize messages carrying
 * the rendered tweet height; apply it to the matching iframe. Replaces the former
 * widgets.js-based TwitterResizePlugin without running any third-party script in
 * our origin.
 */
export class TwitterMessageResizePlugin implements RendererPlugin {
    name = 'twitter-message-resize';

    onMount = (rootElement: HTMLElement): (() => void) | undefined => {
        if (typeof window === 'undefined') return undefined;

        const handleResize = (event: MessageEvent) => {
            if (event.origin !== 'https://platform.twitter.com') return;
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const embed = data?.['twttr.embed'];
                if (!embed || embed.method !== 'twttr.private.resize') return;
                const height = embed.params?.[0]?.height;
                if (!height || typeof height !== 'number' || height < 50) return;
                const iframes = rootElement.querySelectorAll('.twitterWrapper iframe');
                iframes.forEach((iframe) => {
                    if (!(iframe instanceof HTMLIFrameElement)) return;
                    if (iframe.contentWindow === event.source) {
                        iframe.style.height = `${height}px`;
                        // lift the stylesheet's max-height fallback cap - it exists for
                        // tweets that never report a height (e.g. deleted ones)
                        iframe.style.maxHeight = 'none';
                    }
                });
            } catch {
                // Not a twttr.embed message, ignore
            }
        };

        window.addEventListener('message', handleResize);
        return () => window.removeEventListener('message', handleResize);
    };
}
