import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

/**
 * Embedder for Twitter/X posts.
 * Converts Twitter/X URLs to iframe embeds without requiring external scripts.
 *
 * Supported URL formats:
 * - https://twitter.com/username/status/TWEET_ID
 * - https://x.com/username/status/TWEET_ID
 * - https://www.twitter.com/username/status/TWEET_ID
 * - https://www.x.com/username/status/TWEET_ID
 *
 * Note: Both twitter.com and x.com are supported to handle the rebrand.
 * All embeds use platform.twitter.com which remains the stable embed domain.
 */
export class TwitterEmbedder extends AbstractEmbedder {
    public type = 'twitter';

    /**
     * Matches Twitter/X status URLs including trailing path segments,
     * query params and fragments (e.g. /photo/1?s=20#top).
     * Tweet IDs are numeric, typically 19 digits (allow 1-20 for safety).
     * Capture group 1: domain (twitter|x), group 2: tweet ID.
     */
    private static readonly linkRegex = /https?:\/\/(?:www\.)?(twitter|x)\.com\/(?:\w+)\/status\/(\d{1,20})[^\s]*/i;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const data = typeof input === 'string' ? input : input.data;
        try {
            const match = data.match(TwitterEmbedder.linkRegex);
            if (match && match[2]) {
                const id = match[2];
                return {
                    id,
                    url: match[0]
                };
            }
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, _size: {width: number; height: number}): string {
        // Use platform.twitter.com which is the stable embed domain (not affected by x.com rebrand)
        // Note: width/height are handled by CSS; no scrolling="no" so content is scrollable as fallback
        const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${id}`;
        return `<div class="twitterWrapper"><iframe src="${embedUrl}" frameborder="0" allowtransparency="true"></iframe></div>`;
    }
}
