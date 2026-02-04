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
        const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        return `<div class="videoWrapper"><div class="youtube-facade" data-youtube-id="${id}" data-width="${size.width}" data-height="${size.height}"><img src="${thumbnail}" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div>`;
    }
}
