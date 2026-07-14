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
        // Privacy facade (issue #934): emit no third-party request here. The thumbnail URL is
        // carried in data-thumb and loaded *proxied* by the client (rendererContainer); the
        // player.vimeo.com iframe is injected only when the reader clicks play.
        const thumbnail = `https://vumbnail.com/${id}.jpg`;
        return `<div class="videoWrapper"><div class="vimeo-facade embed-facade" data-embed="vimeo" data-vimeo-id="${id}" data-width="${size.width}" data-height="${size.height}" data-thumb="${thumbnail}"><button class="embed-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#1ab7ea"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div>`;
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
