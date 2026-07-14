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
        return `<div class="videoWrapper"><div class="twitch-facade embed-facade" data-embed="twitch" data-twitch-id="${id}" data-width="${size.width}" data-height="${size.height}"><span class="embed-facade-label">Twitch</span><button class="embed-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#9146ff"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div>`;
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
