import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class ThreeSpeakEmbedder extends AbstractEmbedder {
    public type = '3speak';

    private static readonly linkRegex =
        /^(?:https?:\/\/)?(?:(?:3speak\.(?:tv|online|co)\/watch\?v=)|(?:3speak\.tv\/embed\?v=))([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_-]+)(?:&.*)?$/;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const url = typeof input === 'string' ? input : input.data;
        try {
            const match = (url.startsWith('\n') ? url.replace('\n', '') : url).match(ThreeSpeakEmbedder.linkRegex);
            if (match && match[1]) {
                const id = match[1];
                return {
                    id,
                    url: url // Return the original URL
                };
            }
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const embedUrl = `https://3speak.tv/embed?v=${id}`;
        return `<div class="threeSpeakWrapper"><iframe width="${size.width}" height="${size.height}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
    }
}
