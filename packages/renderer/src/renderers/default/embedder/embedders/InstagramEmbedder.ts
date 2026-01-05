import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

/**
 * Embedder for Instagram posts and reels.
 * Converts Instagram URLs to iframe embeds without requiring external scripts.
 *
 * Supported URL formats:
 * - https://www.instagram.com/p/POST_ID/
 * - https://www.instagram.com/reel/REEL_ID/
 * - https://instagram.com/p/POST_ID/
 */
export class InstagramEmbedder extends AbstractEmbedder {
    public type = 'instagram';

    /**
     * Matches Instagram post and reel URLs.
     * Valid shortcode: Base64URL characters, typically 11 chars (allow 10-14 for safety)
     */
    private static readonly linkRegex = /https?:\/\/(?:www\.)?instagram\.com\/(p|reel)\/([a-zA-Z0-9_-]{10,14})\/?/i;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const data = typeof input === 'string' ? input : input.data;
        try {
            const match = data.match(InstagramEmbedder.linkRegex);
            if (match && match[2]) {
                const type = match[1]; // 'p' or 'reel'
                const id = match[2];
                return {
                    // Store both type and id for embed URL construction
                    id: `${type}/${id}`,
                    url: match[0]
                };
            }
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        // id format is "p/POST_ID" or "reel/REEL_ID"
        const embedUrl = `https://www.instagram.com/${id}/embed/`;
        return `<div class="instagramWrapper"><iframe width="${size.width}" height="${size.height}" src="${embedUrl}" frameborder="0" scrolling="no" allowtransparency="true"></iframe></div>`;
    }
}
