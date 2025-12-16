import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata, EmbedSize} from './AbstractEmbedder';

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
            thumbnail: `https://img.youtube.com/vi/${id}/0.jpg`
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

    public processEmbed(id: string, size: EmbedSize): string {
        return this.createVideoWrapper(`https://www.youtube.com/embed/${id}`, size);
    }
}
