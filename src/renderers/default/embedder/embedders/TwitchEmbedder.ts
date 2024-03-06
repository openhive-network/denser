import {Log} from '../../../../Log';
import {AssetEmbedderOptions} from '../AssetEmbedder';
import linksRe from '../utils/Links';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class TwitchEmbedder extends AbstractEmbedder {
    public type = 'twitch';
    private readonly domain: string;

    public constructor(options: AssetEmbedderOptions) {
        super();
        this.domain = new URL(options.baseUrl).hostname;
    }

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const data = child.data;
            const twitch = this.twitchId(data);
            if (!twitch) {
                return undefined;
            }

            return {
                ...twitch
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const url = `https://player.twitch.tv/${id}&parent=${this.domain}`;
        return `<div class="videoWrapper"><iframe src=${url} width=${size.width} height=${size.height} frameBorder="0" allowFullScreen></iframe></div>`;
    }

    private twitchId(data: any) {
        if (!data) {
            return null;
        }
        const m = data.match(linksRe.twitch);
        if (!m || m.length < 3) {
            return null;
        }

        return {
            id: m[1] === `videos` ? `?video=${m[2]}` : `?channel=${m[2]}`,
            url: m[0],
            canonical: m[1] === `videos` ? `https://player.twitch.tv/?video=${m[2]}` : `https://player.twitch.tv/?channel=${m[2]}`
        };
    }
}
