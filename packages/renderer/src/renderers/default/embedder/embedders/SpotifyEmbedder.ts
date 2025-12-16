import {Log} from '../../../../Log';
import {AbstractEmbedder, EmbedMetadata, EmbedSize} from './AbstractEmbedder';

interface SpotifyMetadata {
    id: string;
    url: string;
    canonical: string;
}

export class SpotifyEmbedder extends AbstractEmbedder {
    public type = 'spotify';

    private static readonly regex = {
        main: /https?:\/\/open.spotify.com\/(playlist|show|episode|album|track|artist)\/(.*)/i,
        sanitize: /^https:\/\/open\.spotify\.com\/(embed|embed-podcast)\/(playlist|show|episode|album|track|artist)\/(.*)/i
    };

    private static extractMetadata(data: string): SpotifyMetadata | undefined {
        if (!data) return undefined;
        const m = data.match(SpotifyEmbedder.regex.main);
        if (!m || m.length < 2) return undefined;

        const embed = m[1] === 'show' || m[1] === 'episode' ? 'embed-podcast' : 'embed';

        return {
            id: `${embed}/${m[1]}/${m[2]}`,
            url: m[0],
            canonical: `https://open.spotify.com/${m[1]}/${m[2]}`
        };
    }

    public getEmbedMetadata(child: HTMLObjectElement): EmbedMetadata | undefined {
        try {
            const metadata = SpotifyEmbedder.extractMetadata(child.data);
            if (!metadata) {
                return undefined;
            }
            return {
                id: metadata.id,
                url: metadata.url,
                image: metadata.canonical
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: EmbedSize): string {
        return this.createVideoWrapper(`https://open.spotify.com/${id}`, size);
    }
}
