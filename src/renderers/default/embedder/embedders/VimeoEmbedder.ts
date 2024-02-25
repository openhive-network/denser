import {Log} from '../../../../Log';
import linksRe from '../utils/Links';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class VimeoEmbedder extends AbstractEmbedder {
    public type = 'vimeo';

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const data = child.data;
            const vimeo = this.vimeoId(data);
            if (!vimeo) {
                return undefined;
            }
            return {
                ...vimeo
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const url = `https://player.vimeo.com/video/${id}`;
        return `<div class="videoWrapper"><iframe src=${url} width=${size.width} height=${size.height} frameBorder="0" webkitallowfullscreen mozallowfullscreen allowFullScreen></iframe></div>`;
    }

    private vimeoId(data: string) {
        if (!data) {
            return null;
        }
        const m = data.match(linksRe.vimeo);
        if (!m || m.length < 2) {
            return null;
        }

        return {
            id: m[1],
            url: m[0],
            canonical: `https://player.vimeo.com/video/${m[1]}`
            // thumbnail: requires a callback - http://stackoverflow.com/questions/1361149/get-img-thumbnails-from-vimeo
        };
    }
}
