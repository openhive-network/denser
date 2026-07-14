import {Log} from '../../../../Log';
import {AssetEmbedderOptions} from '../AssetEmbedder';
import linksRe from '../utils/Links';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class TwitchEmbedder extends AbstractEmbedder {
    public type = 'twitch';

    public constructor(_options: AssetEmbedderOptions) {
        super();
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
        // Privacy facade (issue #934): branded placeholder, no third-party request until the
        // reader clicks play. The player.twitch.tv iframe is injected by rendererContainer,
        // which appends the parent= embedding identity Twitch requires (from location.hostname,
        // so it always matches the serving domain). No thumbnail: Twitch previews require an
        // authenticated API lookup.
        return `<div class="videoWrapper"><div class="twitch-facade embed-facade" data-embed="twitch" data-twitch-id="${id}" data-width="${size.width}" data-height="${size.height}"><span class="embed-facade-label">Twitch</span><button class="embed-play-btn" aria-label="Play video"></button></div></div>`;
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
