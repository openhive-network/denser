import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata, EmbedSize} from './AbstractEmbedder';

export class ThreeSpeakEmbedder extends AbstractEmbedder {
    public type = '3speak';

    private static readonly linkRegex = /(?:https?:\/\/)?(?:3speak\.(?:tv|online|co)\/(?:watch|embed)\?v=)([^&\s]+)/i;

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

    public processEmbed(id: string, size: EmbedSize): string {
        return this.createVideoWrapper(`https://3speak.tv/embed?v=${id}`, size, 'threeSpeakWrapper');
    }
}
