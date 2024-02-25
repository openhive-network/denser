import {Log} from '../../../../Log';
import linksRe from '../utils/Links';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class YoutubeEmbedder extends AbstractEmbedder {
    public static getYoutubeMetadataFromLink(data: string): {id: string; url: string; thumbnail: string} | null {
        if (!data) {
            return null;
        }

        const m1 = data.match(linksRe.youTube);
        const url = m1 ? m1[0] : null;
        if (!url) {
            return null;
        }

        const m2 = url.match(linksRe.youTubeId);
        const id = m2 && m2.length >= 2 ? m2[1] : null;
        if (!id) {
            return null;
        }

        return {
            id,
            url,
            thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg'
        };
    }

    public type = 'youtube';

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const metadata = YoutubeEmbedder.getYoutubeMetadataFromLink(child.data);
            if (!metadata) {
                return undefined;
            }
            return {
                ...metadata
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const ytUrl = `https://www.youtube.com/embed/${id}`;
        return `<div class="videoWrapper"><iframe width="${size.width}" height="${size.height}" src="${ytUrl}" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div>`;
    }
}
