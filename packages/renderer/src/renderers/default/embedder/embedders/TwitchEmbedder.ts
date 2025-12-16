import {Log} from '../../../../Log';
import {AssetEmbedderOptions} from '../AssetEmbedder';
import linksRe from '../utils/Links';
import {AbstractEmbedder, EmbedMetadata, EmbedSize} from './AbstractEmbedder';

/** Twitch-specific embed metadata */
interface TwitchMetadata {
    id: string;
    url: string;
    canonical: string;
}

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
            const twitch = this.extractMetadata(data);
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

    public processEmbed(id: string, size: EmbedSize): string {
        return this.createVideoWrapper(`https://player.twitch.tv/${id}&parent=${this.domain}`, size);
    }

    private extractMetadata(data: string | null): TwitchMetadata | null {
        if (!data) {
            return null;
        }
        const m = data.match(linksRe.twitch);
        if (!m || m.length < 3) {
            return null;
        }

        const isVideo = m[1] === 'videos';
        return {
            id: isVideo ? `?video=${m[2]}` : `?channel=${m[2]}`,
            url: m[0],
            canonical: isVideo ? `https://player.twitch.tv/?video=${m[2]}` : `https://player.twitch.tv/?channel=${m[2]}`
        };
    }
}
