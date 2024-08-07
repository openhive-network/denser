import {Log} from '../../../../Log';
import {StaticConfig} from '../../StaticConfig';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class ThreeSpeakEmbedder extends AbstractEmbedder {
    public type = '3speak';

    private static readonly linkRegex = /^(?:https?:\/\/)?(?:(?:3speak\.(?:tv|online|co)\/watch\?v=)|(?:3speak\.tv\/embed\?v=))([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)(?:&.*)?$/;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const url = typeof input === 'string' ? input : input.data;
        try {
            const match = url.match(ThreeSpeakEmbedder.linkRegex);
            if (match && match[1]) {
                const id = match[1];
                return {
                    id,
                    url: `https://3speak.tv/watch?v=${id}`
                };
            }
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const threeSpeakConfig = StaticConfig.sanitization.iframeWhitelist.find((item) => item.re.toString().includes('3speak'));
        if (!threeSpeakConfig) {
            Log.log().error('3Speak configuration not found in StaticConfig');
            return '';
        }

        const embedUrl = `https://3speak.tv/embed?v=${id}`;
        if (!embedUrl) {
            Log.log().error('Failed to generate valid 3Speak embed URL');
            return '';
        }

        return `<div class="threeSpeakWrapper"><iframe width="${size.width}" height="${size.height}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
    }

    private static get3SpeakMetadataFromLink(data: string): {id: string; url: string} | undefined {
        if (!data) {
            return undefined;
        }

        const match = data.match(ThreeSpeakEmbedder.linkRegex);
        if (!match) {
            return undefined;
        }

        const id = match[1];
        const url = `https://3speak.tv/watch?v=${id}`;

        return {id, url};
    }
}
