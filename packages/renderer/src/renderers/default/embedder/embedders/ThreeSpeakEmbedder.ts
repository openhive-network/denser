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
        // Use the `watch?mode=iframe&layout=desktop` form (same as hive.blog/condenser).
        // The `/embed` endpoint renders an extra "Video Info" panel below the player;
        // `mode=iframe&layout=desktop` tells 3Speak to show only the clean player (issue #922).
        const embedUrl = `https://play.3speak.tv/watch?v=${id}&mode=iframe&layout=desktop`;
        return `<div class="threeSpeakWrapper"><iframe width="${size.width}" height="${size.height}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
    }
}
