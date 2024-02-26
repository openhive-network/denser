import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

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

    public processEmbed(id: string, size: {width: number; height: number}): string {
        return `<div class="videoWrapper"><iframe src=${this.generateCanonicalUrl(id)} width=${size.width} height=${size.height} frameBorder="0" webkitallowfullscreen mozallowfullscreen allowFullScreen></iframe></div>`;
    }

    private generateCanonicalUrl(id: string) {
        return `https://player.vimeo.com/video/${id}`;
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
            canonical: this.generateCanonicalUrl(m[1])
        };
    }
}
