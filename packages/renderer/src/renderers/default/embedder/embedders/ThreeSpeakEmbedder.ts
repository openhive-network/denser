import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class ThreeSpeakEmbedder extends AbstractEmbedder {
    public type = '3speak';

    /**
     * Matches 3Speak video URLs.
     * Video IDs are in format: username/permlink (Hive account format)
     * - Username: lowercase alphanumeric, dots, dashes (2-16 chars)
     * - Permlink: lowercase alphanumeric, dashes
     *
     * An optional subdomain (e.g. `play.3speak.tv`) is allowed so the WHOLE URL is
     * captured. Without it the match started at `3speak.tv`, leaving `https://play.`
     * behind and splitting the link into two parts (issue #922).
     */
    private static readonly linkRegex = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)?3[sS]peak\.(?:tv|online|co)\/(?:watch|embed)\?v=([a-z0-9][a-z0-9.-]{1,15}\/[a-z0-9][a-z0-9-]*)/;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const url = typeof input === 'string' ? input : input.data;
        try {
            // Clean the URL by trimming whitespace and removing leading newlines
            const cleanUrl = url.trim().replace(/^\n+/, '');

            // Check if this contains a 3speak URL
            const match = cleanUrl.match(ThreeSpeakEmbedder.linkRegex);
            if (match && match[1]) {
                const id = match[1];
                return {
                    id,
                    url: match[0] // Return the matched URL part
                };
            }
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        // Privacy facade: render a lightweight branded placeholder and emit NO third-party
        // request here. The play.3speak.tv player iframe (watch?mode=iframe&layout=desktop,
        // issue #922) is built and injected only when the reader clicks play
        // (see rendererContainer). A reader who scrolls past never contacts 3Speak. See #934.
        // No thumbnail is fetched: 3Speak exposes no deterministic per-video thumbnail URL,
        // so a generic placeholder is used rather than leaking a request to derive one.
        return `<div class="threeSpeakWrapper videoWrapper"><div class="threespeak-facade embed-facade" data-embed="threespeak" data-threespeak-id="${id}" data-width="${size.width}" data-height="${size.height}"><span class="embed-facade-label">3Speak</span><button class="embed-play-btn" aria-label="Play video"></button></div></div>`;
    }
}
