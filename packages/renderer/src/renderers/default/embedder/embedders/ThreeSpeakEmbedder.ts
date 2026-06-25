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
        return `<div class="threeSpeakWrapper videoWrapper"><div class="threespeak-facade embed-facade" data-embed="threespeak" data-threespeak-id="${id}" data-width="${size.width}" data-height="${size.height}"><span class="embed-facade-label">3Speak</span><button class="embed-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#e6007a"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div>`;
    }
}
