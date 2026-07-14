import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class YoutubeEmbedder extends AbstractEmbedder {
    public type = 'youtube';

    private static readonly linkRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)[^ ]*/i;
    private static readonly idRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)/i;

    public static getYoutubeMetadataFromLink(data: string): {id: string; url: string; thumbnail: string} | undefined {
        if (!data) {
            return undefined;
        }

        const m1 = data.match(YoutubeEmbedder.linkRegex);
        const url = m1 ? m1[0] : undefined;
        if (!url) {
            return undefined;
        }

        const m2 = url.match(YoutubeEmbedder.idRegex);
        const id = m2 && m2.length >= 2 ? m2[2] : undefined;
        if (!id) {
            return undefined;
        }

        return {
            id,
            url,
            thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg'
        };
    }

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const metadata = YoutubeEmbedder.getYoutubeMetadataFromLink(child.data);
            if (!metadata) {
                return undefined;
            }
            return {
                id: metadata.id,
                url: metadata.url,
                image: metadata.thumbnail
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        // Privacy facade: emit NO third-party request here. The thumbnail URL is carried
        // in data-thumb and loaded *proxied* by the client (rendererContainer), and the
        // YouTube player iframe is injected only when the reader clicks play. So a reader
        // who scrolls past never contacts youtube.com / img.youtube.com. See issue #934.
        const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        return `<div class="videoWrapper"><div class="youtube-facade embed-facade" data-embed="youtube" data-youtube-id="${id}" data-width="${size.width}" data-height="${size.height}" data-thumb="${thumbnail}"><button class="youtube-play-btn embed-play-btn" aria-label="Play video"></button></div></div>`;
    }
}
