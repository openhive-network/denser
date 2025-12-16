import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata, EmbedSize} from './AbstractEmbedder';

export class VimeoEmbedder extends AbstractEmbedder {
    public type = 'vimeo';

    private static readonly regex = /https?:\/\/(?:vimeo.com\/|player.vimeo.com\/video\/)([0-9]+)\/*/;

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const data = child.data;
            const metadata = this.extractMetadata(data);
            if (!metadata) {
                return undefined;
            }
            return {
                id: metadata.id,
                url: metadata.url
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: EmbedSize): string {
        return this.createVideoWrapper(`https://player.vimeo.com/video/${id}`, size);
    }

    private extractMetadata(data: string) {
        if (!data) {
            return null;
        }
        const m = data.match(VimeoEmbedder.regex);
        if (!m || m.length < 2) {
            return null;
        }

        return {
            id: m[1],
            url: m[0],
            canonical: `https://player.vimeo.com/video/${m[1]}`
        };
    }
}
